// finetune-studio/server/services/gateway/src/routes/jobs.rs
use axum::{
    Router,
    routing::{get, post},
    extract::{Path, Query, State},
    http::HeaderMap,
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use futures::StreamExt;
use serde::Deserialize;
use std::{convert::Infallible, time::Duration};
use uuid::Uuid;

use shared::{
    auth::{jwt, middleware::extract_bearer},
    db::{datasets, jobs},
    errors::{AppError, AppResult},
    types::job::{Job, JobStatus},
};
use redis::aio::ConnectionManager;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateJobRequest {
    pub dataset_id:     Uuid,
    pub base_model:     String,
    pub method:         String,
    pub hyperparams:    serde_json::Value,
    pub method_cfg:     serde_json::Value,
    pub hf_dataset_id:  Option<String>,
    pub hf_split:       Option<String>,
    pub hf_config:      Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub limit:  Option<i64>,
    pub status: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/jobs",            post(create).get(list))
        .route("/api/v1/jobs/:id",        get(get_one).delete(cancel))
        .route("/api/v1/jobs/:id/stream", get(stream_job))
}

async fn auth_uid(state: &AppState, headers: &HeaderMap) -> AppResult<Uuid> {
    let token  = extract_bearer(headers)?;
    let claims = jwt::verify(token, &state.cfg.jwt_secret)?;
    jwt::user_id_from_claims(&claims)
}

// ── POST /api/v1/jobs ─────────────────────────────────────────────────
async fn create(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<CreateJobRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let uid = auth_uid(&state, &headers).await?;

    if !["lora","qlora","peft","sft","dpo","orpo"].contains(&body.method.as_str()) {
        return Err(AppError::Validation(format!("Unknown method '{}'", body.method)));
    }

    let ds = datasets::find_by_id(&state.db, body.dataset_id)
        .await?.ok_or(AppError::NotFound("Dataset".into()))?;
    if ds.user_id != uid {
        return Err(AppError::Forbidden("You don't own this dataset".into()));
    }

    let mut hp = body.hyperparams.clone();
    if let Some(ref hf) = body.hf_dataset_id {
        hp["hf_dataset_id"] = serde_json::json!(hf);
        hp["hf_split"]  = serde_json::json!(body.hf_split.as_deref().unwrap_or("train"));
        hp["hf_config"] = serde_json::json!(body.hf_config.as_deref().unwrap_or("default"));
    }

    let job = jobs::create(
        &state.db, uid, body.dataset_id,
        &body.base_model, &body.method, hp, body.method_cfg,
    ).await?;

    // Push job to Redis queue
    let queue  = format!("queue:jobs:{}", body.method);
    let payload= serde_json::to_string(&serde_json::json!({
        "job_id":     job.id,
        "user_id":    uid,
        "dataset_id": body.dataset_id,
        "base_model": body.base_model,
        "method":     body.method,
    })).unwrap();

    let mut conn = state.redis.clone();
    if let Err(e) = redis::cmd("LPUSH").arg(&queue).arg(&payload)
        .query_async::<ConnectionManager, ()>(&mut conn).await {
        tracing::error!("Redis LPUSH failed: {e}");
    }

    tracing::info!("Job {} created + queued to {}", job.id, queue);
    Ok(Json(serde_json::json!({ "job": job, "queue": queue })))
}

// ── GET /api/v1/jobs ──────────────────────────────────────────────────
async fn list(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Query(q):     Query<ListQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let uid   = auth_uid(&state, &headers).await?;
    let limit = q.limit.unwrap_or(20).min(100);
    let all   = jobs::list_for_user(&state.db, uid, limit).await?;

    let filtered: Vec<&Job> = match &q.status {
        Some(s) => all.iter().filter(|j| j.status == *s).collect(),
        None    => all.iter().collect(),
    };

    Ok(Json(serde_json::json!({ "jobs": filtered, "total": filtered.len() })))
}

// ── GET /api/v1/jobs/:id ──────────────────────────────────────────────
async fn get_one(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
) -> AppResult<Json<Job>> {
    let uid = auth_uid(&state, &headers).await?;
    let job = jobs::find_by_id(&state.db, id)
        .await?.ok_or(AppError::NotFound("Job".into()))?;
    if job.user_id != uid { return Err(AppError::Forbidden("Access denied".into())); }
    Ok(Json(job))
}

// ── DELETE /api/v1/jobs/:id ───────────────────────────────────────────
async fn cancel(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let uid = auth_uid(&state, &headers).await?;
    let job = jobs::find_by_id(&state.db, id)
        .await?.ok_or(AppError::NotFound("Job".into()))?;
    if job.user_id != uid { return Err(AppError::Forbidden("Access denied".into())); }
    if ["done","failed","stopped"].contains(&job.status.as_str()) {
        return Err(AppError::BadRequest("Job already finished".into()));
    }
    jobs::update_status(&state.db, id, &JobStatus::Stopped).await?;

    let mut conn = state.redis.clone();
    let _ = redis::cmd("PUBLISH")
        .arg(format!("job:{id}:control")).arg("cancel")
        .query_async::<ConnectionManager, ()>(&mut conn).await;

    Ok(Json(serde_json::json!({ "message": "Job cancelled", "id": id })))
}

// ── GET /api/v1/jobs/:id/stream — SSE ────────────────────────────────
async fn stream_job(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
) -> AppResult<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>> {

    let uid = auth_uid(&state, &headers).await?;
    let job = jobs::find_by_id(&state.db, id)
        .await?.ok_or(AppError::NotFound("Job".into()))?;
    if job.user_id != uid { return Err(AppError::Forbidden("Access denied".into())); }

    let redis_url = state.cfg.redis_url.clone();
    let job_id    = id.to_string();

    let stream = async_stream::stream! {
        let client = match redis::Client::open(redis_url.as_str()) {
            Ok(c)  => c,
            Err(e) => {
                yield Ok(Event::default().event("error").data(format!("{{\"message\":\"{e}\"}}")));
                return;
            }
        };

        let mut pubsub = match client.get_async_pubsub().await {
            Ok(p)  => p,
            Err(e) => {
                yield Ok(Event::default().event("error").data(format!("{{\"message\":\"{e}\"}}")));
                return;
            }
        };

        for suffix in &["loss","logs","status","progress"] {
            let _ = pubsub.subscribe(format!("job:{job_id}:{suffix}")).await;
        }

        // Initial connected event
        yield Ok(Event::default().event("connected")
            .data(format!("{{\"job_id\":\"{job_id}\"}}")));

        let mut msgs  = pubsub.on_message();
        let mut timer = tokio::time::interval(Duration::from_secs(15));

        loop {
            tokio::select! {
                msg = msgs.next() => {
                    let Some(m) = msg else { break };
                    let channel: String  = m.get_channel_name().to_string();
                    let payload: String  = m.get_payload().unwrap_or_default();
                    let event_type = channel.rsplit(':').next().unwrap_or("message");

                    yield Ok(Event::default().event(event_type).data(payload.clone()));

                    // Auto-close on terminal status
                    if event_type == "status" {
                        let v: serde_json::Value = serde_json::from_str(&payload).unwrap_or_default();
                        let s = v.get("status").and_then(|x| x.as_str()).unwrap_or(&payload);
                        if ["done","failed","stopped"].contains(&s) { break; }
                    }
                }
                _ = timer.tick() => {
                    yield Ok(Event::default().event("ping").data("{}"));
                }
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(
        KeepAlive::new().interval(Duration::from_secs(15)).text("ping")
    ))
}

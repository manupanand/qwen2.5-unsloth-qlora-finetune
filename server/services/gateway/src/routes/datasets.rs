// finetune-studio/server/services/gateway/src/routes/datasets.rs
use axum::{
    Router,
    routing::{get, post},
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use shared::{
    auth::{jwt, middleware::extract_bearer},
    db::datasets,
    errors::{AppError, AppResult},
    types::dataset::Dataset,
};
use crate::AppState;

// ── Request / Response types ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UploadUrlRequest {
    pub file_name:    String,
    pub file_size:    i64,
    pub format:       String,
    pub dataset_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UploadUrlResponse {
    pub upload_url: String,
    pub object_key: String,
    pub expires_in: u32,
    pub method:     String,
}

#[derive(Debug, Deserialize)]
pub struct MultipartInitRequest {
    pub file_name:    String,
    pub file_size:    i64,
    pub format:       String,
    pub dataset_name: Option<String>,
    pub chunk_size:   Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct MultipartInitResponse {
    pub upload_id:   String,
    pub object_key:  String,
    pub chunk_size:  i64,
    pub total_parts: u32,
}

#[derive(Debug, Deserialize)]
pub struct MultipartPartRequest {
    pub upload_id:   String,
    pub object_key:  String,
    pub part_number: u32,
}

#[derive(Debug, Serialize)]
pub struct MultipartPartResponse {
    pub upload_url:  String,
    pub part_number: u32,
    pub expires_in:  u32,
}

#[derive(Debug, Deserialize)]
pub struct MultipartCompleteRequest {
    pub upload_id:    String,
    pub object_key:   String,
    pub file_name:    String,
    pub file_size:    i64,
    pub format:       String,
    pub dataset_name: Option<String>,
    pub parts:        Vec<CompletedPart>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CompletedPart {
    pub part_number: u32,
    pub etag:        String,
}

#[derive(Debug, Deserialize)]
pub struct ConfirmRequest {
    pub object_key:   String,
    pub file_name:    String,
    pub file_size:    i64,
    pub format:       String,
    pub dataset_name: Option<String>,
    pub row_count:    Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub page:  Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDatasetRequest {
    pub name:        Option<String>,
    pub description: Option<String>,
}

// ── Router ────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/datasets",                    get(list).post(confirm))
        .route("/api/v1/datasets/upload-url",         post(upload_url))
        .route("/api/v1/datasets/multipart/init",     post(multipart_init))
        .route("/api/v1/datasets/multipart/part",     post(multipart_part))
        .route("/api/v1/datasets/multipart/complete", post(multipart_complete))
        .route("/api/v1/datasets/multipart/abort",    post(multipart_abort))
        .route("/api/v1/datasets/:id",                get(get_one).patch(update).delete(soft_delete))
}

// ── AWS Signature V4 presigned URL (MinIO compatible) ─────────────────

fn presigned_put_url(
    endpoint:   &str,
    access_key: &str,
    secret_key: &str,
    region:     &str,
    bucket:     &str,
    object_key: &str,
    expires:    u32,
) -> String {
    use hmac::{Hmac, Mac};
    use sha2::{Digest, Sha256};
    type HmacSha256 = Hmac<Sha256>;

    let now      = Utc::now();
    let date_str = now.format("%Y%m%d").to_string();
    let datetime = now.format("%Y%m%dT%H%M%SZ").to_string();
    let scope    = format!("{}/{}/s3/aws4_request", date_str, region);
    let cred     = format!("{}/{}", access_key, scope);
    let host     = endpoint
        .trim_start_matches("https://")
        .trim_start_matches("http://");

    let query = format!(
        "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={}&X-Amz-Date={}&X-Amz-Expires={}&X-Amz-SignedHeaders=host",
        pct_encode(&cred), datetime, expires
    );

    let canon = format!(
        "PUT\n/{}/{}\n{}\nhost:{}\n\nhost\nUNSIGNED-PAYLOAD",
        bucket, object_key, query, host
    );

    let canon_hash = hex::encode(Sha256::digest(canon.as_bytes()));
    let sts = format!("AWS4-HMAC-SHA256\n{}\n{}\n{}", datetime, scope, canon_hash);

    let sign = |key: &[u8], msg: &[u8]| -> Vec<u8> {
        let mut mac = HmacSha256::new_from_slice(key).unwrap();
        mac.update(msg);
        mac.finalize().into_bytes().to_vec()
    };

    let dk  = sign(format!("AWS4{}", secret_key).as_bytes(), date_str.as_bytes());
    let rk  = sign(&dk,  region.as_bytes());
    let sk  = sign(&rk,  b"s3");
    let sgk = sign(&sk,  b"aws4_request");
    let sig = hex::encode(sign(&sgk, sts.as_bytes()));

    format!("{}/{}/{}?{}&X-Amz-Signature={}", endpoint, bucket, object_key, query, sig)
}

fn pct_encode(s: &str) -> String {
    s.bytes().flat_map(|b| match b {
        b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' |
        b'-' | b'_' | b'.' | b'~' => vec![b as char],
        _ => format!("%{:02X}", b).chars().collect::<Vec<_>>(),
    }).collect()
}

fn dataset_object_key(user_id: &Uuid, file_name: &str) -> String {
    let ts  = Utc::now().timestamp();
    let ext = file_name.rsplit('.').next().unwrap_or("bin");
    format!("uploads/{}/{}.{}", user_id, ts, ext)
}

// ── Auth helper ───────────────────────────────────────────────────────

async fn auth_uid(state: &AppState, headers: &HeaderMap) -> AppResult<Uuid> {
    let token  = extract_bearer(headers)?;
    let claims = jwt::verify(token, &state.cfg.jwt_secret)?;
    jwt::user_id_from_claims(&claims)
}

// ── Handlers ──────────────────────────────────────────────────────────

/// POST /api/v1/datasets/upload-url  — presigned PUT for single file < 100MB
async fn upload_url(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<UploadUrlRequest>,
) -> AppResult<Json<UploadUrlResponse>> {
    let uid = auth_uid(&state, &headers).await?;

    if !["jsonl","json","csv","txt"].contains(&body.format.as_str()) {
        return Err(AppError::Validation(format!("Unsupported format '{}'", body.format)));
    }
    if body.file_size > 100 * 1024 * 1024 {
        return Err(AppError::Validation(
            "File > 100MB. Use /api/v1/datasets/multipart/init instead.".into()
        ));
    }

    let object_key = dataset_object_key(&uid, &body.file_name);
    let expires    = 600u32;
    // Sign using the PUBLIC URL — MinIO validates the Host header in the request
    // so the signing endpoint must match what the client actually sends.
    // STORAGE_PUBLIC_URL = http://localhost:9000 (from outside Docker)
    // STORAGE_ENDPOINT   = http://finetune-minio:9000 (internal Docker only)
    let upload_url = presigned_put_url(
        &state.cfg.storage_public_url,   // ← sign with public URL
        &state.cfg.storage_access_key,
        &state.cfg.storage_secret_key,
        &state.cfg.storage_region,
        &state.cfg.storage_bucket_datasets,
        &object_key,
        expires,
    );

    tracing::info!("Presigned PUT issued: user={} key={}", uid, object_key);
    Ok(Json(UploadUrlResponse {
        upload_url, object_key, expires_in: expires, method: "PUT".into(),
    }))
}

/// POST /api/v1/datasets/multipart/init  — start a multipart upload
async fn multipart_init(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<MultipartInitRequest>,
) -> AppResult<Json<MultipartInitResponse>> {
    let uid        = auth_uid(&state, &headers).await?;
    let chunk_size = body.chunk_size.unwrap_or(10 * 1024 * 1024);
    let total_parts= ((body.file_size + chunk_size - 1) / chunk_size) as u32;

    if total_parts > 10_000 {
        return Err(AppError::Validation("File too large — max 10,000 parts".into()));
    }

    let object_key = dataset_object_key(&uid, &body.file_name);
    let upload_id  = Uuid::new_v4().to_string();

    tracing::info!("Multipart init: user={} parts={} key={}", uid, total_parts, object_key);
    Ok(Json(MultipartInitResponse { upload_id, object_key, chunk_size, total_parts }))
}

/// POST /api/v1/datasets/multipart/part  — presigned URL for one chunk
async fn multipart_part(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<MultipartPartRequest>,
) -> AppResult<Json<MultipartPartResponse>> {
    let _uid    = auth_uid(&state, &headers).await?;
    let part_key   = format!("{}.part{}", body.object_key, body.part_number);
    let upload_url = presigned_put_url(
        &state.cfg.storage_public_url,   // ← sign with public URL
        &state.cfg.storage_access_key,
        &state.cfg.storage_secret_key,
        &state.cfg.storage_region,
        &state.cfg.storage_bucket_datasets,
        &part_key, 300,
    );
    Ok(Json(MultipartPartResponse { upload_url, part_number: body.part_number, expires_in: 300 }))
}

/// POST /api/v1/datasets/multipart/complete  — assemble all parts
async fn multipart_complete(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<MultipartCompleteRequest>,
) -> AppResult<(StatusCode, Json<Dataset>)> {
    let uid  = auth_uid(&state, &headers).await?;
    let name = body.dataset_name.clone().unwrap_or_else(|| body.file_name.clone());

    tracing::info!("Multipart complete: user={} parts={}", uid, body.parts.len());

    let ds = datasets::create(
        &state.db, uid, &name, &body.format,
        &state.cfg.storage_bucket_datasets, &body.object_key, Some(body.file_size),
    ).await?;
    Ok((StatusCode::CREATED, Json(ds)))
}

/// POST /api/v1/datasets/multipart/abort
async fn multipart_abort(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(_body):  Json<serde_json::Value>,
) -> AppResult<Json<serde_json::Value>> {
    let uid = auth_uid(&state, &headers).await?;
    tracing::info!("Multipart aborted: user={}", uid);
    Ok(Json(serde_json::json!({ "message": "Upload aborted" })))
}

/// POST /api/v1/datasets  — confirm after direct MinIO upload
async fn confirm(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<ConfirmRequest>,
) -> AppResult<(StatusCode, Json<Dataset>)> {
    let uid  = auth_uid(&state, &headers).await?;
    let name = body.dataset_name.clone().unwrap_or_else(|| body.file_name.clone());

    if !["jsonl","json","csv","txt"].contains(&body.format.as_str()) {
        return Err(AppError::Validation(format!("Unsupported format '{}'", body.format)));
    }

    let ds = datasets::create(
        &state.db, uid, &name, &body.format,
        &state.cfg.storage_bucket_datasets, &body.object_key, Some(body.file_size),
    ).await?;

    tracing::info!("Dataset confirmed: {} ({}) user={}", ds.name, ds.id, uid);
    Ok((StatusCode::CREATED, Json(ds)))
}

/// GET /api/v1/datasets
async fn list(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Query(q):     Query<ListQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let uid    = auth_uid(&state, &headers).await?;
    let limit  = q.limit.unwrap_or(20).min(100);
    let page   = q.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let (rows, total) = datasets::list_for_user_paginated(&state.db, uid, limit, offset).await?;

    Ok(Json(serde_json::json!({
        "datasets": rows,
        "total":    total,
        "page":     page,
        "limit":    limit,
        "pages":    ((total as f64) / (limit as f64)).ceil() as i64,
    })))
}

/// GET /api/v1/datasets/:id
async fn get_one(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
) -> AppResult<Json<Dataset>> {
    let uid = auth_uid(&state, &headers).await?;
    let ds  = datasets::find_by_id(&state.db, id)
        .await?
        .ok_or(AppError::NotFound("Dataset".into()))?;
    if ds.user_id != uid {
        return Err(AppError::Forbidden("Access denied".into()));
    }
    Ok(Json(ds))
}

/// PATCH /api/v1/datasets/:id
async fn update(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
    Json(body):   Json<UpdateDatasetRequest>,
) -> AppResult<Json<Dataset>> {
    let uid = auth_uid(&state, &headers).await?;
    let ds  = datasets::find_by_id(&state.db, id)
        .await?
        .ok_or(AppError::NotFound("Dataset".into()))?;
    if ds.user_id != uid {
        return Err(AppError::Forbidden("Access denied".into()));
    }
    let updated = datasets::update_meta(
        &state.db, id,
        body.name.as_deref(),
        body.description.as_deref(),
    ).await?;
    Ok(Json(updated))
}

/// DELETE /api/v1/datasets/:id — soft delete
async fn soft_delete(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Path(id):     Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let uid = auth_uid(&state, &headers).await?;
    let ds  = datasets::find_by_id(&state.db, id)
        .await?
        .ok_or(AppError::NotFound("Dataset".into()))?;
    if ds.user_id != uid {
        return Err(AppError::Forbidden("Access denied".into()));
    }
    datasets::soft_delete(&state.db, id).await?;
    tracing::info!("Dataset deleted: {} ({}) user={}", ds.name, id, uid);
    Ok(Json(serde_json::json!({ "message": "Dataset deleted", "id": id })))
}

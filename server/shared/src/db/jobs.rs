// finetune-studio/server/shared/src/db/jobs.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::{errors::AppResult, types::job::{Job, JobStatus}};

pub async fn create(
    pool:        &PgPool,
    user_id:     Uuid,
    dataset_id:  Uuid,
    base_model:  &str,
    method:      &str,
    hyperparams: serde_json::Value,
    method_cfg:  serde_json::Value,
) -> AppResult<Job> {
    sqlx::query_as::<_, Job>(
        "INSERT INTO jobs (user_id, dataset_id, base_model, method, status, hyperparams, method_cfg)
         VALUES ($1, $2, $3, $4, 'queued', $5, $6)
         RETURNING *"
    )
    .bind(user_id)
    .bind(dataset_id)
    .bind(base_model)
    .bind(method)
    .bind(hyperparams)
    .bind(method_cfg)
    .fetch_one(pool)
    .await
    .map_err(|e| crate::errors::AppError::Database(e))
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Job>> {
    sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| crate::errors::AppError::Database(e))
}

pub async fn list_for_user(pool: &PgPool, user_id: Uuid, limit: i64) -> AppResult<Vec<Job>> {
    sqlx::query_as::<_, Job>(
        "SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2"
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| crate::errors::AppError::Database(e))
}

pub async fn update_status(pool: &PgPool, id: Uuid, status: &JobStatus) -> AppResult<()> {
    sqlx::query("UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2")
        .bind(status.to_string())
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| crate::errors::AppError::Database(e))?;
    Ok(())
}

// finetune-studio/server/shared/src/db/datasets.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::{errors::AppResult, types::dataset::Dataset};

pub async fn create(
    pool:          &PgPool,
    user_id:       Uuid,
    name:          &str,
    format:        &str,
    bucket:        &str,
    raw_file_path: &str,
) -> AppResult<Dataset> {
    sqlx::query_as::<_, Dataset>(
        "INSERT INTO datasets (user_id, name, format, bucket, raw_file_path)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *"
    )
    .bind(user_id)
    .bind(name)
    .bind(format)
    .bind(bucket)
    .bind(raw_file_path)
    .fetch_one(pool)
    .await
    .map_err(|e| crate::errors::AppError::Database(e))
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Dataset>> {
    sqlx::query_as::<_, Dataset>("SELECT * FROM datasets WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| crate::errors::AppError::Database(e))
}

pub async fn list_for_user(pool: &PgPool, user_id: Uuid) -> AppResult<Vec<Dataset>> {
    sqlx::query_as::<_, Dataset>(
        "SELECT * FROM datasets WHERE user_id = $1 ORDER BY created_at DESC"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| crate::errors::AppError::Database(e))
}

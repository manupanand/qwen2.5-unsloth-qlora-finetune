// finetune-studio/server/shared/src/db/datasets.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::{errors::{AppError, AppResult}, types::dataset::Dataset};

pub async fn create(
    pool:          &PgPool,
    user_id:       Uuid,
    name:          &str,
    format:        &str,
    bucket:        &str,
    raw_file_path: &str,
    file_size:     Option<i64>,
) -> AppResult<Dataset> {
    sqlx::query_as::<_, Dataset>(
        "INSERT INTO datasets (user_id, name, format, bucket, raw_file_path, file_size_bytes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'uploaded')
         RETURNING *"
    )
    .bind(user_id).bind(name).bind(format)
    .bind(bucket).bind(raw_file_path).bind(file_size)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Dataset>> {
    sqlx::query_as::<_, Dataset>(
        "SELECT * FROM datasets WHERE id = $1 AND status != 'deleted'"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn list_for_user(pool: &PgPool, user_id: Uuid) -> AppResult<Vec<Dataset>> {
    sqlx::query_as::<_, Dataset>(
        "SELECT * FROM datasets WHERE user_id = $1 AND status != 'deleted'
         ORDER BY created_at DESC"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn list_for_user_paginated(
    pool:    &PgPool,
    user_id: Uuid,
    limit:   i64,
    offset:  i64,
) -> AppResult<(Vec<Dataset>, i64)> {
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM datasets WHERE user_id = $1 AND status != 'deleted'"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)?;

    let rows = sqlx::query_as::<_, Dataset>(
        "SELECT * FROM datasets WHERE user_id = $1 AND status != 'deleted'
         ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(user_id).bind(limit).bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;

    Ok((rows, total))
}

pub async fn update_meta(
    pool:        &PgPool,
    id:          Uuid,
    name:        Option<&str>,
    description: Option<&str>,
) -> AppResult<Dataset> {
    match (name, description) {
        (Some(n), Some(d)) => sqlx::query_as::<_, Dataset>(
            "UPDATE datasets SET name=$1, description=$2, updated_at=NOW()
             WHERE id=$3 RETURNING *"
        ).bind(n).bind(d).bind(id).fetch_one(pool).await,
        (Some(n), None) => sqlx::query_as::<_, Dataset>(
            "UPDATE datasets SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *"
        ).bind(n).bind(id).fetch_one(pool).await,
        (None, Some(d)) => sqlx::query_as::<_, Dataset>(
            "UPDATE datasets SET description=$1, updated_at=NOW() WHERE id=$2 RETURNING *"
        ).bind(d).bind(id).fetch_one(pool).await,
        (None, None) => return find_by_id(pool, id).await?.ok_or(AppError::NotFound("Dataset".into())).map(Ok)?,
    }
    .map_err(AppError::Database)
}

pub async fn soft_delete(pool: &PgPool, id: Uuid) -> AppResult<()> {
    sqlx::query(
        "UPDATE datasets SET status='deleted', updated_at=NOW() WHERE id=$1"
    )
    .bind(id)
    .execute(pool)
    .await
    .map_err(AppError::Database)?;
    Ok(())
}

pub async fn update_row_count(pool: &PgPool, id: Uuid, row_count: i32) -> AppResult<()> {
    sqlx::query(
        "UPDATE datasets SET row_count=$1, status='ready', updated_at=NOW() WHERE id=$2"
    )
    .bind(row_count).bind(id)
    .execute(pool)
    .await
    .map_err(AppError::Database)?;
    Ok(())
}

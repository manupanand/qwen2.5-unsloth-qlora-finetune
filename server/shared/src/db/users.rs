// finetune-studio/server/shared/src/db/users.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::{errors::{AppError, AppResult}, types::user::User};

pub async fn find_by_email(pool: &PgPool, email: &str) -> AppResult<Option<User>> {
    sqlx::query_as::<_, User>(
        "SELECT id, email, name, role, password_hash, hf_token_enc,
                is_active, last_login_at, created_at, updated_at
         FROM users WHERE email = $1 AND is_active = true"
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    sqlx::query_as::<_, User>(
        "SELECT id, email, name, role, password_hash, hf_token_enc,
                is_active, last_login_at, created_at, updated_at
         FROM users WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn create(
    pool:          &PgPool,
    email:         &str,
    name:          &str,
    password_hash: Option<&str>,
) -> AppResult<User> {
    if find_by_email(pool, email).await?.is_some() {
        return Err(AppError::Conflict(format!("Email '{email}' is already registered")));
    }
    sqlx::query_as::<_, User>(
        "INSERT INTO users (email, name, role, password_hash)
         VALUES ($1, $2, 'user', $3)
         RETURNING id, email, name, role, password_hash, hf_token_enc,
                   is_active, last_login_at, created_at, updated_at"
    )
    .bind(email)
    .bind(name)
    .bind(password_hash)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

pub async fn touch_login(pool: &PgPool, id: Uuid) -> AppResult<()> {
    sqlx::query("UPDATE users SET last_login_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(AppError::Database)?;
    Ok(())
}

/// Update name and/or email — both optional
pub async fn update_profile(
    pool:      &PgPool,
    id:        Uuid,
    new_name:  Option<&str>,
    new_email: Option<&str>,
) -> AppResult<User> {
    // Build query dynamically based on what was provided
    let user = match (new_name, new_email) {
        (Some(name), Some(email)) => {
            sqlx::query_as::<_, User>(
                "UPDATE users SET name = $1, email = $2, updated_at = NOW()
                 WHERE id = $3
                 RETURNING id, email, name, role, password_hash, hf_token_enc,
                           is_active, last_login_at, created_at, updated_at"
            )
            .bind(name).bind(email).bind(id)
            .fetch_one(pool).await
        }
        (Some(name), None) => {
            sqlx::query_as::<_, User>(
                "UPDATE users SET name = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, email, name, role, password_hash, hf_token_enc,
                           is_active, last_login_at, created_at, updated_at"
            )
            .bind(name).bind(id)
            .fetch_one(pool).await
        }
        (None, Some(email)) => {
            sqlx::query_as::<_, User>(
                "UPDATE users SET email = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, email, name, role, password_hash, hf_token_enc,
                           is_active, last_login_at, created_at, updated_at"
            )
            .bind(email).bind(id)
            .fetch_one(pool).await
        }
        (None, None) => unreachable!(),
    };
    user.map_err(AppError::Database)
}

/// Update password hash
pub async fn update_password(pool: &PgPool, id: Uuid, new_hash: &str) -> AppResult<()> {
    sqlx::query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(new_hash).bind(id)
    .execute(pool)
    .await
    .map_err(AppError::Database)?;
    Ok(())
}

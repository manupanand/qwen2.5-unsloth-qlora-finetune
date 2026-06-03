use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Every service returns this error type.
/// It converts automatically into an Axum HTTP response.
#[derive(Debug, Error)]
pub enum AppError {
    // ── Auth ──────────────────────────────────────────────────────
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Token expired")]
    TokenExpired,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    // ── Validation ────────────────────────────────────────────────
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    // ── Not found ─────────────────────────────────────────────────
    #[error("{0} not found")]
    NotFound(String),

    // ── Conflict ──────────────────────────────────────────────────
    #[error("{0} already exists")]
    Conflict(String),

    // ── Internal ──────────────────────────────────────────────────
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis error: {0}")]
    Redis(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Internal server error: {0}")]
    Internal(String),
}

impl AppError {
    fn status(&self) -> StatusCode {
        match self {
            Self::InvalidCredentials  => StatusCode::UNAUTHORIZED,
            Self::TokenExpired        => StatusCode::UNAUTHORIZED,
            Self::InvalidToken        => StatusCode::UNAUTHORIZED,
            Self::Unauthorized(_)     => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_)        => StatusCode::FORBIDDEN,
            Self::Validation(_)       => StatusCode::UNPROCESSABLE_ENTITY,
            Self::BadRequest(_)       => StatusCode::BAD_REQUEST,
            Self::NotFound(_)         => StatusCode::NOT_FOUND,
            Self::Conflict(_)         => StatusCode::CONFLICT,
            Self::Database(_)         => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Redis(_)            => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Storage(_)          => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Internal(_)         => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::InvalidCredentials  => "INVALID_CREDENTIALS",
            Self::TokenExpired        => "TOKEN_EXPIRED",
            Self::InvalidToken        => "INVALID_TOKEN",
            Self::Unauthorized(_)     => "UNAUTHORIZED",
            Self::Forbidden(_)        => "FORBIDDEN",
            Self::Validation(_)       => "VALIDATION_ERROR",
            Self::BadRequest(_)       => "BAD_REQUEST",
            Self::NotFound(_)         => "NOT_FOUND",
            Self::Conflict(_)         => "CONFLICT",
            Self::Database(_)         => "DATABASE_ERROR",
            Self::Redis(_)            => "REDIS_ERROR",
            Self::Storage(_)          => "STORAGE_ERROR",
            Self::Internal(_)         => "INTERNAL_ERROR",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status();

        // Don't leak internal error details to client in non-debug builds
        let message = match &self {
            Self::Database(_) | Self::Redis(_) | Self::Storage(_) | Self::Internal(_) => {
                tracing::error!("Internal error: {}", self);
                "An internal error occurred".to_string()
            }
            _ => self.to_string(),
        };

        let body = Json(json!({
            "error": {
                "code":    self.code(),
                "message": message,
            }
        }));

        (status, body).into_response()
    }
}

/// Convenience alias used everywhere
pub type AppResult<T> = Result<T, AppError>;

/// Convert anyhow errors into internal AppError
impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self::Internal(e.to_string())
    }
}

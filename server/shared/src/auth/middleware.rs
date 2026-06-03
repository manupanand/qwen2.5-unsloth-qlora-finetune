// finetune-studio/server/shared/src/auth/middleware.rs
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
};
use crate::{
    auth::jwt::{self, Claims},
    errors::{AppError, AppResult},
};

/// Axum extractor that validates the Bearer token and injects Claims.
/// Usage in handlers:
///   async fn my_handler(AuthUser(claims): AuthUser) -> ...
pub struct AuthUser(pub Claims);

pub trait HasJwtSecret {
    fn jwt_secret(&self) -> &str;
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync + HasJwtSecret,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let token = extract_bearer(&parts.headers)?;
        let claims = jwt::verify(token, state.jwt_secret())?;
        Ok(AuthUser(claims))
    }
}

pub fn extract_bearer(headers: &HeaderMap) -> AppResult<&str> {
    let header = headers
        .get("Authorization")
        .ok_or(AppError::Unauthorized("Missing Authorization header".into()))?
        .to_str()
        .map_err(|_| AppError::Unauthorized("Invalid Authorization header".into()))?;

    header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized("Authorization header must be 'Bearer <token>'".into()))
}

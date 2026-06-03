use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::errors::{AppError, AppResult};

/// Claims embedded in every JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub:   String,     // user UUID
    pub email: String,
    pub role:  String,
    pub exp:   i64,        // expiry unix timestamp
    pub iat:   i64,        // issued-at unix timestamp
    pub kind:  TokenKind,  // access vs refresh
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TokenKind {
    Access,
    Refresh,
}

/// Generate an access token (short-lived)
pub fn sign_access(
    user_id:     Uuid,
    email:       &str,
    role:        &str,
    secret:      &str,
    expiry_secs: u64,
) -> AppResult<String> {
    sign(user_id, email, role, secret, expiry_secs, TokenKind::Access)
}

/// Generate a refresh token (long-lived)
pub fn sign_refresh(
    user_id:     Uuid,
    email:       &str,
    role:        &str,
    secret:      &str,
    expiry_secs: u64,
) -> AppResult<String> {
    sign(user_id, email, role, secret, expiry_secs, TokenKind::Refresh)
}

fn sign(
    user_id:     Uuid,
    email:       &str,
    role:        &str,
    secret:      &str,
    expiry_secs: u64,
    kind:        TokenKind,
) -> AppResult<String> {
    let now = Utc::now().timestamp();
    let claims = Claims {
        sub:   user_id.to_string(),
        email: email.to_string(),
        role:  role.to_string(),
        iat:   now,
        exp:   now + expiry_secs as i64,
        kind,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT sign error: {e}")))
}

/// Verify a token and return its claims
pub fn verify(token: &str, secret: &str) -> AppResult<Claims> {
    let mut validation = Validation::default();
    validation.validate_exp = true;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
        _ => AppError::InvalidToken,
    })
}

/// Extract user UUID from verified claims
pub fn user_id_from_claims(claims: &Claims) -> AppResult<Uuid> {
    Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InvalidToken)
}

// finetune-studio/server/services/gateway/src/routes/auth.rs
//
// POST  /api/v1/auth/register         — create account → return tokens
// POST  /api/v1/auth/login            — verify password → return tokens
// GET   /api/v1/auth/me               — validate JWT → return user profile
// PATCH /api/v1/auth/me               — update name / email
// POST  /api/v1/auth/change-password  — verify current → set new password
// POST  /api/v1/auth/refresh          — exchange refresh token → new access token

use axum::{
    Router,
    routing::{get, post},
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use shared::{
    auth::{jwt, middleware::extract_bearer, password},
    db::users,
    errors::{AppError, AppResult},
    types::user::UserPublic,
};
use crate::AppState;

// ── Request / Response types ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name:     String,
    pub email:    String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email:    String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name:  Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password:     String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token:  String,
    pub refresh_token: String,
    pub token_type:    String,
    pub expires_in:    u64,
    pub user:          UserPublic,
}

// ── Router ────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/auth/register",        post(register))
        .route("/api/v1/auth/login",           post(login))
        .route("/api/v1/auth/me",              get(me).patch(update_profile))
        .route("/api/v1/auth/change-password", post(change_password))
        .route("/api/v1/auth/refresh",         post(refresh))
}

// ── Handlers ──────────────────────────────────────────────────────────

/// POST /api/v1/auth/register
async fn register(
    State(state): State<AppState>,
    Json(body):   Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<AuthResponse>)> {

    if body.name.trim().is_empty() {
        return Err(AppError::Validation("Name is required".into()));
    }
    if !body.email.contains('@') {
        return Err(AppError::Validation("Invalid email address".into()));
    }
    if body.password.len() < 8 {
        return Err(AppError::Validation("Password must be at least 8 characters".into()));
    }

    let hash = password::hash_password(&body.password)?;
    let user = users::create(&state.db, &body.email, &body.name, Some(&hash)).await?;
    let (access, refresh) = issue_tokens(&user, &state)?;

    tracing::info!("New user registered: {} ({})", user.email, user.id);

    Ok((StatusCode::CREATED, Json(AuthResponse {
        access_token:  access,
        refresh_token: refresh,
        token_type:    "Bearer".into(),
        expires_in:    state.cfg.jwt_expiry_secs,
        user:          UserPublic::from(user),
    })))
}

/// POST /api/v1/auth/login
async fn login(
    State(state): State<AppState>,
    Json(body):   Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {

    let user = users::find_by_email(&state.db, &body.email)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    let hash = user.password_hash.as_deref()
        .ok_or(AppError::InvalidCredentials)?;

    if !password::verify_password(&body.password, hash)? {
        return Err(AppError::InvalidCredentials);
    }

    users::touch_login(&state.db, user.id).await?;
    let (access, refresh) = issue_tokens(&user, &state)?;

    tracing::info!("User logged in: {} ({})", user.email, user.id);

    Ok(Json(AuthResponse {
        access_token:  access,
        refresh_token: refresh,
        token_type:    "Bearer".into(),
        expires_in:    state.cfg.jwt_expiry_secs,
        user:          UserPublic::from(user),
    }))
}

/// GET /api/v1/auth/me
async fn me(
    State(state): State<AppState>,
    headers:      HeaderMap,
) -> AppResult<Json<UserPublic>> {
    let user = authed_user(&state, &headers).await?;
    Ok(Json(UserPublic::from(user)))
}

/// PATCH /api/v1/auth/me
/// Body: { "name": "New Name", "email": "new@email.com" }
/// Email change: checks not already taken, then updates
async fn update_profile(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<UpdateProfileRequest>,
) -> AppResult<Json<UserPublic>> {
    let user = authed_user(&state, &headers).await?;

    // Validate + normalise fields
    let new_name = match &body.name {
        Some(n) => {
            let n = n.trim();
            if n.is_empty() { return Err(AppError::Validation("Name cannot be empty".into())) }
            Some(n.to_string())
        }
        None => None,
    };

    let new_email = match &body.email {
        Some(e) => {
            let e = e.trim().to_lowercase();
            if !e.contains('@') { return Err(AppError::Validation("Invalid email address".into())) }
            // Check not already taken by another user
            if e != user.email.to_lowercase() {
                if let Some(existing) = users::find_by_email(&state.db, &e).await? {
                    if existing.id != user.id {
                        return Err(AppError::Conflict(format!("Email '{e}' is already in use")));
                    }
                }
            }
            Some(e)
        }
        None => None,
    };

    // Nothing to update
    if new_name.is_none() && new_email.is_none() {
        return Ok(Json(UserPublic::from(user)));
    }

    let updated = users::update_profile(
        &state.db,
        user.id,
        new_name.as_deref(),
        new_email.as_deref(),
    ).await?;

    tracing::info!("Profile updated: {} ({})", updated.email, updated.id);
    Ok(Json(UserPublic::from(updated)))
}

/// POST /api/v1/auth/change-password
async fn change_password(
    State(state): State<AppState>,
    headers:      HeaderMap,
    Json(body):   Json<ChangePasswordRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user = authed_user(&state, &headers).await?;

    // Verify current password
    let hash = user.password_hash.as_deref()
        .ok_or(AppError::BadRequest("Account has no password (SSO user)".into()))?;

    if !password::verify_password(&body.current_password, hash)? {
        return Err(AppError::Validation("Current password is incorrect".into()));
    }

    // Validate new password
    if body.new_password.len() < 8 {
        return Err(AppError::Validation("New password must be at least 8 characters".into()));
    }
    if body.new_password == body.current_password {
        return Err(AppError::Validation("New password must be different from current".into()));
    }

    let new_hash = password::hash_password(&body.new_password)?;
    users::update_password(&state.db, user.id, &new_hash).await?;

    tracing::info!("Password changed: {} ({})", user.email, user.id);
    Ok(Json(serde_json::json!({ "message": "Password updated successfully" })))
}

/// POST /api/v1/auth/refresh
async fn refresh(
    State(state): State<AppState>,
    Json(body):   Json<serde_json::Value>,
) -> AppResult<Json<serde_json::Value>> {

    let token = body.get("refresh_token")
        .and_then(|v| v.as_str())
        .ok_or(AppError::BadRequest("Missing refresh_token".into()))?;

    let claims = jwt::verify(token, &state.cfg.jwt_secret)?;

    if claims.kind != jwt::TokenKind::Refresh {
        return Err(AppError::InvalidToken);
    }

    let uid  = jwt::user_id_from_claims(&claims)?;
    let user = users::find_by_id(&state.db, uid)
        .await?
        .ok_or(AppError::Unauthorized("User no longer exists".into()))?;

    let access = jwt::sign_access(
        user.id, &user.email, &user.role,
        &state.cfg.jwt_secret, state.cfg.jwt_expiry_secs,
    )?;

    Ok(Json(serde_json::json!({
        "access_token": access,
        "token_type":   "Bearer",
        "expires_in":   state.cfg.jwt_expiry_secs,
    })))
}

// ── Helpers ───────────────────────────────────────────────────────────

/// Extract and verify JWT, then load user from DB
async fn authed_user(
    state:   &AppState,
    headers: &HeaderMap,
) -> AppResult<shared::types::user::User> {
    let token  = extract_bearer(headers)?;
    let claims = jwt::verify(token, &state.cfg.jwt_secret)?;
    let uid    = jwt::user_id_from_claims(&claims)?;
    users::find_by_id(&state.db, uid)
        .await?
        .ok_or(AppError::NotFound("User".into()))
}

fn issue_tokens(
    user:  &shared::types::user::User,
    state: &AppState,
) -> AppResult<(String, String)> {
    let access = jwt::sign_access(
        user.id, &user.email, &user.role,
        &state.cfg.jwt_secret, state.cfg.jwt_expiry_secs,
    )?;
    let refresh = jwt::sign_refresh(
        user.id, &user.email, &user.role,
        &state.cfg.jwt_secret, state.cfg.refresh_expiry_secs,
    )?;
    Ok((access, refresh))
}

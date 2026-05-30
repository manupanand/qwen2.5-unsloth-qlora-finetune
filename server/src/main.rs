mod config;

use axum::{
    Router,
    routing::get,
    response::{Html, IntoResponse, Response},
    http::StatusCode,
    extract::State,
};
use std::{net::SocketAddr, sync::Arc};
use tower_http::{
    services::ServeDir,
    cors::{CorsLayer, Any, AllowOrigin},
    trace::TraceLayer,
};
use tracing::info;
use tokio::fs;

use config::Config;

/// Shared application state — cloned cheaply into every handler via Arc
#[derive(Clone)]
struct AppState {
    cfg: Arc<Config>,
}

#[tokio::main]
async fn main() {
    // 1. Load .env file (silently ignored if missing — real env vars take over)
    dotenvy::dotenv().ok();

    // 2. Parse and validate config
    let cfg = Arc::new(Config::from_env());

    // 3. Init tracing (must happen after config so we pick up RUST_LOG)
    tracing_subscriber::fmt()
        .with_env_filter(&cfg.rust_log)
        .init();

    // 4. Log what we loaded
    cfg.log_summary();

    // 5. Build router
    let state = AppState { cfg: cfg.clone() };
    let app = build_router(state);

    // 6. Bind and serve
    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));
    info!("Listening on http://{}", addr);
    info!("UI → http://{}/agent/view/finetune-llm", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn build_router(state: AppState) -> Router {
    let cfg = &state.cfg;
    let ui_base = "/agent/view/finetune-llm";
    let assets_path = format!("{}/assets", cfg.dist_dir);

    // CORS
    let cors = if cfg.cors_origins == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        let origins: Vec<_> = cfg.cors_origins
            .split(',')
            .filter_map(|o| o.trim().parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(Any)
            .allow_headers(Any)
    };

    Router::new()
        // ── Health ────────────────────────────────────────────────
        .route("/health", get(health_handler))

        // ── API stubs (Phase 2: real LoRA training via Candle) ────
        .route("/api/v1/jobs",             get(api_placeholder))
        .route("/api/v1/jobs/:id",         get(api_placeholder))
        .route("/api/v1/jobs/:id/stream",  get(api_placeholder))
        .route("/api/v1/models",           get(api_placeholder))

        // ── UI static assets ──────────────────────────────────────
        .nest_service(
            &format!("{}/assets", ui_base),
            ServeDir::new(assets_path),
        )

        // ── UI SPA routes (all fall back to index.html) ───────────
        .route(ui_base,                   get(spa_handler))
        .route(&format!("{}/*path", ui_base), get(spa_handler))

        // ── Root redirect → UI ────────────────────────────────────
        .route("/", get(|| async {
            axum::response::Redirect::permanent("/agent/view/finetune-llm")
        }))

        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

/// Serve index.html for all SPA routes
async fn spa_handler(State(state): State<AppState>) -> Response {
    let index = format!("{}/index.html", state.cfg.dist_dir);
    match fs::read_to_string(&index).await {
        Ok(html) => Html(html).into_response(),
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            "UI not built. Run `npm run build` first, or check DIST_DIR.",
        ).into_response(),
    }
}

/// Health check — returns config summary (no secrets)
async fn health_handler(State(state): State<AppState>) -> impl IntoResponse {
    (StatusCode::OK, axum::Json(serde_json::json!({
        "status": "ok",
        "service": "lora-studio",
        "port": state.cfg.port,
        "llm_endpoint": state.cfg.llm_endpoint,
        "model_storage": state.cfg.model_storage_path,
    })))
}

async fn api_placeholder() -> impl IntoResponse {
    (StatusCode::OK, axum::Json(serde_json::json!({
        "message": "Phase 2: LoRA training API — coming soon",
    })))
}

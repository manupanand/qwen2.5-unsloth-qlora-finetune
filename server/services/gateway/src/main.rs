// finetune-studio/server/services/gateway/src/main.rs
mod config;
mod routes;

use axum::{Router, routing::get, response::{Html, IntoResponse, Response}, http::StatusCode, extract::State};
use std::{net::SocketAddr, sync::Arc};
use tower_http::{services::ServeDir, cors::{CorsLayer, Any, AllowOrigin}, trace::TraceLayer};
use tracing::info;
use tokio::fs;
use sqlx::PgPool;
use redis::aio::ConnectionManager;
use config::Config;

#[derive(Clone)]
pub struct AppState {
    pub cfg:   Arc<Config>,
    pub db:    PgPool,
    pub redis: ConnectionManager,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let cfg = Arc::new(Config::from_env());
    tracing_subscriber::fmt().with_env_filter(&cfg.rust_log).init();
    cfg.log_summary();

    info!("Connecting to PostgreSQL...");
    let db = shared::db::create_pool(&cfg.database_url).await;
    info!("PostgreSQL connected ✓");

    info!("Connecting to Redis...");
    let redis = shared::redis::create_client(&cfg.redis_url).await;
    info!("Redis connected ✓");

    let state = AppState { cfg: cfg.clone(), db, redis };
    let app   = build_router(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));
    info!("Listening on http://{}", addr);
    info!("UI  → http://{}/agent/view/finetune-llm/auth", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn build_router(state: AppState) -> Router {
    let ui_base    = "/agent/view/finetune-llm";
    let assets_dir = format!("{}/assets", state.cfg.dist_dir);

    let cors = if state.cfg.cors_origins == "*" {
        CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)
    } else {
        let origins: Vec<_> = state.cfg.cors_origins
            .split(',').filter_map(|o| o.trim().parse().ok()).collect();
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(Any).allow_headers(Any)
    };

    Router::new()
        .route("/health",                     get(health_handler))
        .merge(routes::auth::router())
        .merge(routes::datasets::router())
        .merge(routes::models::router())
        .merge(routes::jobs::router())
        .nest_service(&format!("{}/assets", ui_base), ServeDir::new(assets_dir))
        .route(ui_base,                       get(spa_handler))
        .route(&format!("{}/*path", ui_base), get(spa_handler))
        .route("/", get(|| async {
            axum::response::Redirect::permanent("/agent/view/finetune-llm/auth")
        }))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

async fn spa_handler(State(state): State<AppState>) -> Response {
    let index = format!("{}/index.html", state.cfg.dist_dir);
    match fs::read_to_string(&index).await {
        Ok(html) => Html(html).into_response(),
        Err(_)   => (StatusCode::SERVICE_UNAVAILABLE, "UI not built. Run npm run build.").into_response(),
    }
}

async fn health_handler(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = shared::db::health_check(&state.db).await;
    (
        if db_ok { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE },
        axum::Json(serde_json::json!({
            "status":  if db_ok { "ok" } else { "degraded" },
            "service": "finetune-studio-gateway",
            "db":      if db_ok { "connected" } else { "unreachable" },
        }))
    )
}

// finetune-studio/server/services/gateway/src/config.rs
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port:                u16,
    pub dist_dir:            String,
    pub database_url:        String,
    pub cors_origins:        String,
    pub rust_log:            String,
    // ── Auth ──────────────────────────────────────────────────────
    pub jwt_secret:          String,
    pub jwt_expiry_secs:     u64,
    pub refresh_expiry_secs: u64,
    // ── LLM / Models ──────────────────────────────────────────────
    pub llm_endpoint:        String,
    pub model_storage_path:  String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port:                env_u16("PORT", 8000),
            dist_dir:            env_str("DIST_DIR", "./dist"),
            database_url:        env_required("DATABASE_URL"),
            cors_origins:        env_str("CORS_ORIGINS", "*"),
            rust_log:            env_str("RUST_LOG", "info,gateway=debug"),
            jwt_secret:          env_required("JWT_SECRET"),
            jwt_expiry_secs:     env_u64("JWT_EXPIRY_SECS", 3600),
            refresh_expiry_secs: env_u64("REFRESH_EXPIRY_SECS", 604800),
            llm_endpoint:        env_str("LLM_ENDPOINT", "http://localhost:11434"),
            model_storage_path:  env_str("MODEL_STORAGE_PATH", "./models"),
        }
    }

    pub fn log_summary(&self) {
        tracing::info!("═══════════════════════════════════════");
        tracing::info!("  Finetune Studio — Gateway");
        tracing::info!("  port       : {}", self.port);
        tracing::info!("  dist_dir   : {}", self.dist_dir);
        tracing::info!("  database   : {}", redact(&self.database_url));
        tracing::info!("  jwt_expiry : {}s", self.jwt_expiry_secs);
        tracing::info!("═══════════════════════════════════════");
    }
}

fn env_required(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| {
        panic!("Required env var `{key}` is not set. Add it to server.env")
    })
}

fn env_str(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_u16(key: &str, default: u16) -> u16 {
    env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn env_u64(key: &str, default: u64) -> u64 {
    env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn redact(url: &str) -> String {
    if let (Some(at), Some(sep)) = (url.rfind('@'), url.find("://")) {
        let scheme = &url[..sep + 3];
        let creds  = &url[sep + 3..at];
        let user   = creds.split(':').next().unwrap_or(creds);
        let host   = &url[at..];
        return format!("{scheme}{user}:***{host}");
    }
    url.to_string()
}

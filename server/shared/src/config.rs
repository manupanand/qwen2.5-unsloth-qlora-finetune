use std::env;

/// Shared runtime config — every service loads this.
/// Service-specific config lives in each service's own config.rs.
#[derive(Debug, Clone)]
pub struct Config {
    // ── Server ────────────────────────────────────────────────────
    pub port:     u16,
    pub dist_dir: String,

    // ── Database ──────────────────────────────────────────────────
    pub database_url: String,

    // ── Redis ─────────────────────────────────────────────────────
    pub redis_url: String,

    // ── Qdrant ────────────────────────────────────────────────────
    pub qdrant_url:     String,
    pub qdrant_api_key: Option<String>,

    // ── MinIO / S3 ────────────────────────────────────────────────
    pub storage_endpoint:         String,
    pub storage_access_key:       String,
    pub storage_secret_key:       String,
    pub storage_bucket_datasets:  String,
    pub storage_bucket_adapters:  String,
    pub storage_bucket_checkpoints: String,
    pub storage_bucket_exports:   String,

    // ── Auth ──────────────────────────────────────────────────────
    pub jwt_secret:          String,
    pub jwt_expiry_secs:     u64,
    pub refresh_expiry_secs: u64,

    // ── OAuth (optional) ──────────────────────────────────────────
    pub google_client_id:     Option<String>,
    pub google_client_secret: Option<String>,
    pub github_client_id:     Option<String>,
    pub github_client_secret: Option<String>,
    pub oauth_redirect_base:  String,

    // ── LLM ───────────────────────────────────────────────────────
    pub llm_endpoint:       String,
    pub hf_token:           Option<String>,
    pub model_storage_path: String,

    // ── CORS / Logging ────────────────────────────────────────────
    pub cors_origins: String,
    pub rust_log:     String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port:     env_u16("PORT", 8000),
            dist_dir: env_str("DIST_DIR", "./dist"),

            database_url: env_required("DATABASE_URL"),
            redis_url:    env_required("REDIS_URL"),

            qdrant_url:     env_str("QDRANT_URL",     "http://finetune-qdrant:6333"),
            qdrant_api_key: env_optional("QDRANT_API_KEY"),

            storage_endpoint:           env_str("STORAGE_ENDPOINT",           "http://finetune-minio:9000"),
            storage_access_key:         env_required("STORAGE_ACCESS_KEY"),
            storage_secret_key:         env_required("STORAGE_SECRET_KEY"),
            storage_bucket_datasets:    env_str("STORAGE_BUCKET_DATASETS",    "finetune-datasets"),
            storage_bucket_adapters:    env_str("STORAGE_BUCKET_ADAPTERS",    "finetune-adapters"),
            storage_bucket_checkpoints: env_str("STORAGE_BUCKET_CHECKPOINTS", "finetune-checkpoints"),
            storage_bucket_exports:     env_str("STORAGE_BUCKET_EXPORTS",     "finetune-exports"),

            jwt_secret:          env_required("JWT_SECRET"),
            jwt_expiry_secs:     env_u64("JWT_EXPIRY_SECS",     3600),      // 1h
            refresh_expiry_secs: env_u64("REFRESH_EXPIRY_SECS", 604800),   // 7d

            google_client_id:     env_optional("GOOGLE_CLIENT_ID"),
            google_client_secret: env_optional("GOOGLE_CLIENT_SECRET"),
            github_client_id:     env_optional("GITHUB_CLIENT_ID"),
            github_client_secret: env_optional("GITHUB_CLIENT_SECRET"),
            oauth_redirect_base:  env_str("OAUTH_REDIRECT_BASE", "http://localhost:8000"),

            llm_endpoint:       env_str("LLM_ENDPOINT",       "http://localhost:11434"),
            hf_token:           env_optional("HF_TOKEN"),
            model_storage_path: env_str("MODEL_STORAGE_PATH", "./models"),

            cors_origins: env_str("CORS_ORIGINS", "*"),
            rust_log:     env_str("RUST_LOG", "info,finetune_studio=debug"),
        }
    }

    pub fn log_summary(&self) {
        tracing::info!("═══════════════════════════════════════════");
        tracing::info!("  Finetune Studio — config");
        tracing::info!("  port          : {}", self.port);
        tracing::info!("  database_url  : {}", redact(&self.database_url));
        tracing::info!("  redis_url     : {}", redact(&self.redis_url));
        tracing::info!("  qdrant_url    : {}", self.qdrant_url);
        tracing::info!("  storage       : {}", self.storage_endpoint);
        tracing::info!("  jwt_secret    : [set]");
        tracing::info!("  google_oauth  : {}", self.google_client_id.is_some());
        tracing::info!("  github_oauth  : {}", self.github_client_id.is_some());
        tracing::info!("  hf_token      : {}", self.hf_token.is_some());
        tracing::info!("═══════════════════════════════════════════");
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

pub fn env_required(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| {
        panic!("Required env var `{key}` is not set. Add it to server.env")
    })
}

pub fn env_optional(key: &str) -> Option<String> {
    env::var(key).ok()
}

pub fn env_str(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

pub fn env_u16(key: &str, default: u16) -> u16 {
    env::var(key).ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

pub fn env_u64(key: &str, default: u64) -> u64 {
    env::var(key).ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

pub fn redact(url: &str) -> String {
    if let (Some(at), Some(sep)) = (url.rfind('@'), url.find("://")) {
        let scheme = &url[..sep + 3];
        let creds  = &url[sep + 3..at];
        let user   = creds.split(':').next().unwrap_or(creds);
        let host   = &url[at..];
        return format!("{scheme}{user}:***{host}");
    }
    url.to_string()
}

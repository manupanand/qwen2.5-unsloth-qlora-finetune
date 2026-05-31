//! Application config — loaded once at startup from .env + real env vars.
//!
//! Priority (highest → lowest):
//!   1. Real environment variables  (set in shell / docker-compose env:)
//!   2. .env file values            (loaded by dotenvy)
//!   3. Default values in this file

use std::env;

/// All runtime configuration for the server.
/// Add a new field here + a matching line in `from_env()` whenever you
/// need a new endpoint, key, or flag.
#[derive(Debug, Clone)]
pub struct Config {
    // ── Server ────────────────────────────────────────────────────
    /// TCP port the Axum server binds to
    pub port: u16,

    /// Filesystem path where the React dist folder lives
    /// (relative to the binary's working directory)
    pub dist_dir: String,

    // ── Database ──────────────────────────────────────────────────
    /// Full connection string, e.g. postgres://user:pass@host/db
    pub database_url: String,

    // ── LLM / Model endpoints ─────────────────────────────────────
    /// Base URL of the LLM inference server (Candle / llama.cpp / vLLM)
    pub llm_endpoint: String,

    /// Optional HuggingFace token for gated model downloads
    pub hf_token: Option<String>,

    // ── Object storage (model weights + adapters) ─────────────────
    /// Where to store / load base model weights and LoRA adapters
    pub model_storage_path: String,

    // ── CORS ──────────────────────────────────────────────────────
    /// Comma-separated allowed origins, or "*" for any
    pub cors_origins: String,

    // ── Logging ───────────────────────────────────────────────────
    pub rust_log: String,
}

impl Config {
    /// Load config from environment (after dotenvy has ingested .env).
    /// Panics on startup if a required variable is missing so you know
    /// immediately rather than failing silently at runtime.
    pub fn from_env() -> Self {
        Self {
            // ── Server ────────────────────────────────────────────
            port: env_u16("PORT", 8000),
            dist_dir: env_str("DIST_DIR", "./dist"),

            // ── Database ──────────────────────────────────────────
            database_url: env_required("DATABASE_URL"),

            // ── LLM ───────────────────────────────────────────────
            llm_endpoint: env_str("LLM_ENDPOINT", "http://localhost:11434"),
            hf_token: env_optional("HF_TOKEN"),

            // ── Storage ───────────────────────────────────────────
            model_storage_path: env_str("MODEL_STORAGE_PATH", "./models"),

            // ── CORS ──────────────────────────────────────────────
            cors_origins: env_str("CORS_ORIGINS", "*"),

            // ── Logging ───────────────────────────────────────────
            rust_log: env_str("RUST_LOG", "info,finetune_studio_server=debug"),
        }
    }

    /// Pretty-print config at startup (redacts secrets)
    pub fn log_summary(&self) {
        tracing::info!("────────────────────────────────────────");
        tracing::info!("  Finetune Studio — config");
        tracing::info!("  port             : {}", self.port);
        tracing::info!("  dist_dir         : {}", self.dist_dir);
        tracing::info!("  database_url     : {}", redact(&self.database_url));
        tracing::info!("  llm_endpoint     : {}", self.llm_endpoint);
        tracing::info!("  hf_token         : {}", if self.hf_token.is_some() { "set" } else { "not set" });
        tracing::info!("  model_storage    : {}", self.model_storage_path);
        tracing::info!("  cors_origins     : {}", self.cors_origins);
        tracing::info!("────────────────────────────────────────");
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/// Required variable — panics with a clear message if missing
fn env_required(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| {
        panic!(
            "Required env var `{}` is not set. \
             Add it to your .env file or set it in the environment.",
            key
        )
    })
}

/// Optional variable — returns None if not set
fn env_optional(key: &str) -> Option<String> {
    env::var(key).ok()
}

/// String with a default
fn env_str(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

/// u16 with a default, panics if value isn't a valid port number
fn env_u16(key: &str, default: u16) -> u16 {
    match env::var(key) {
        Ok(val) => val.parse::<u16>().unwrap_or_else(|_| {
            panic!("`{}` must be a valid port number (0-65535), got: {}", key, val)
        }),
        Err(_) => default,
    }
}

/// Redact passwords in URLs for logging: postgres://user:REDACTED@host/db
fn redact(url: &str) -> String {
    if let Some(at) = url.rfind('@') {
        if let Some(scheme_end) = url.find("://") {
            let scheme = &url[..scheme_end + 3];
            let host_part = &url[at..];
            // find user between :// and the first : or @
            let creds = &url[scheme_end + 3..at];
            let user = creds.split(':').next().unwrap_or(creds);
            return format!("{}{}:REDACTED{}", scheme, user, host_part);
        }
    }
    url.to_string()
}

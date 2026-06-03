use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Adapter {
    pub id:             Uuid,
    pub job_id:         Uuid,
    pub user_id:        Uuid,
    pub version:        i32,
    pub bucket:         String,
    pub adapter_path:   String,
    pub config_path:    String,
    pub tokenizer_path: Option<String>,
    pub gguf_path:      Option<String>,
    pub file_size_mb:   Option<f64>,
    pub base_model:     String,
    pub method:         String,
    pub is_deployed:    bool,
    pub deployed_at:    Option<DateTime<Utc>>,
    pub perplexity:     Option<f64>,
    pub bleu:           Option<f64>,
    pub created_at:     DateTime<Utc>,
}

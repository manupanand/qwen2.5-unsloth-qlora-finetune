// finetune-studio/server/shared/src/types/dataset.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Dataset {
    pub id:                  Uuid,
    pub user_id:             Uuid,
    pub name:                String,
    pub description:         Option<String>,
    pub format:              String,
    pub bucket:              String,
    pub raw_file_path:       String,
    pub processed_file_path: Option<String>,
    pub row_count:           Option<i32>,
    pub avg_input_length:    Option<i32>,
    pub avg_output_length:   Option<i32>,
    pub file_size_bytes:     Option<i64>,
    pub embedding_indexed:   bool,
    pub qdrant_collection:   Option<String>,
    pub status:              String,
    pub error_msg:           Option<String>,
    pub created_at:          DateTime<Utc>,
    pub updated_at:          DateTime<Utc>,
}

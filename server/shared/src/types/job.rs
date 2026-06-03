// finetune-studio/server/shared/src/types/job.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Job {
    pub id:            Uuid,
    pub user_id:       Uuid,
    pub dataset_id:    Uuid,
    pub base_model:    String,
    pub method:        String,
    pub status:        String,
    pub hyperparams:   serde_json::Value,
    pub method_cfg:    serde_json::Value,
    pub current_step:  i32,
    pub total_steps:   Option<i32>,
    pub current_epoch: i32,
    pub total_epochs:  Option<i32>,
    pub current_loss:  Option<f64>,
    pub best_loss:     Option<f64>,
    pub queued_at:     DateTime<Utc>,
    pub started_at:    Option<DateTime<Utc>>,
    pub finished_at:   Option<DateTime<Utc>>,
    pub error_msg:     Option<String>,
    pub created_at:    DateTime<Utc>,
    pub updated_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus { Queued, Running, Done, Failed, Stopped }

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Queued  => write!(f, "queued"),
            Self::Running => write!(f, "running"),
            Self::Done    => write!(f, "done"),
            Self::Failed  => write!(f, "failed"),
            Self::Stopped => write!(f, "stopped"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TrainingMethod { Lora, Qlora, Peft, Sft, Dpo, Orpo }

impl std::fmt::Display for TrainingMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Lora  => write!(f, "lora"),
            Self::Qlora => write!(f, "qlora"),
            Self::Peft  => write!(f, "peft"),
            Self::Sft   => write!(f, "sft"),
            Self::Dpo   => write!(f, "dpo"),
            Self::Orpo  => write!(f, "orpo"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TrainingEvent {
    Loss     { step: i32, epoch: i32, loss: f64, lr: f64 },
    Log      { message: String },
    Status   { status: JobStatus },
    Progress { pct: u8, step: i32, total: i32 },
    Done     { adapter_path: String },
    Error    { message: String },
}

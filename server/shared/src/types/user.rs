// finetune-studio/server/shared/src/types/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id:            Uuid,
    pub email:         String,
    pub name:          String,
    pub role:          String,           // stored as text in DB
    pub password_hash: Option<String>,
    pub hf_token_enc:  Option<String>,
    pub is_active:     bool,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at:    DateTime<Utc>,
    pub updated_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole { Admin, User, Viewer }

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Admin  => write!(f, "admin"),
            Self::User   => write!(f, "user"),
            Self::Viewer => write!(f, "viewer"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id:         Uuid,
    pub email:      String,
    pub name:       String,
    pub role:       String,
    pub is_active:  bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(u: User) -> Self {
        Self {
            id: u.id, email: u.email, name: u.name,
            role: u.role, is_active: u.is_active, created_at: u.created_at,
        }
    }
}

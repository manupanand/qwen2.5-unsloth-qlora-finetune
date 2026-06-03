use redis::aio::ConnectionManager;
use crate::errors::AppResult;
use super::{set_ex, get, del};

const WIZARD_TTL: u64 = 7200; // 2 hours

pub async fn save_wizard(
    conn:    &mut ConnectionManager,
    user_id: &str,
    state:   &serde_json::Value,
) -> AppResult<()> {
    let key   = format!("session:{user_id}:wizard");
    let value = serde_json::to_string(state).unwrap();
    set_ex(conn, &key, &value, WIZARD_TTL).await
}

pub async fn load_wizard(
    conn:    &mut ConnectionManager,
    user_id: &str,
) -> AppResult<Option<serde_json::Value>> {
    let key = format!("session:{user_id}:wizard");
    match get(conn, &key).await? {
        Some(s) => Ok(serde_json::from_str(&s).ok()),
        None    => Ok(None),
    }
}

pub async fn clear_wizard(conn: &mut ConnectionManager, user_id: &str) -> AppResult<()> {
    del(conn, &format!("session:{user_id}:wizard")).await
}

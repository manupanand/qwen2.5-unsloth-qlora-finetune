use redis::{aio::ConnectionManager, AsyncCommands};
use crate::errors::{AppError, AppResult};

const QUEUE_PREFIX: &str = "queue:jobs";

/// Push a job ID onto the pending queue for a given method.
/// Workers BRPOP from the same key.
/// e.g. queue:jobs:lora, queue:jobs:qlora
pub async fn enqueue(
    conn:      &mut ConnectionManager,
    method:    &str,
    job_id:    &str,
) -> AppResult<()> {
    let key = format!("{QUEUE_PREFIX}:{method}");
    conn.lpush::<_, _, ()>(&key, job_id)
        .await
        .map_err(|e| AppError::Redis(format!("enqueue failed: {e}")))?;
    tracing::debug!("Enqueued job {job_id} → {key}");
    Ok(())
}

/// Pop a job from the queue (blocking, used by workers).
/// Returns (queue_name, job_id) or None on timeout.
pub async fn dequeue(
    conn:       &mut ConnectionManager,
    methods:    &[&str],
    timeout_secs: f64,
) -> AppResult<Option<(String, String)>> {
    let keys: Vec<String> = methods
        .iter()
        .map(|m| format!("{QUEUE_PREFIX}:{m}"))
        .collect();

    let result: Option<(String, String)> = conn
        .brpop(&keys, timeout_secs)
        .await
        .map_err(|e| AppError::Redis(format!("dequeue failed: {e}")))?;

    Ok(result)
}

/// Queue depth for a method (for monitoring)
pub async fn depth(conn: &mut ConnectionManager, method: &str) -> AppResult<i64> {
    let key = format!("{QUEUE_PREFIX}:{method}");
    conn.llen::<_, i64>(&key)
        .await
        .map_err(|e| AppError::Redis(e.to_string()))
}

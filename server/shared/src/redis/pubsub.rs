use redis::{aio::ConnectionManager, AsyncCommands};
use crate::{errors::{AppError, AppResult}, types::job::TrainingEvent};

/// Publish a training event to the job's Redis channel.
/// The SSE service subscribes and forwards to the browser.
///
/// Channels:
///   job:{job_id}:loss      → loss point JSON
///   job:{job_id}:logs      → log line string
///   job:{job_id}:status    → status string
///   job:{job_id}:progress  → progress JSON
pub async fn publish_event(
    conn:   &mut ConnectionManager,
    job_id: &str,
    event:  &TrainingEvent,
) -> AppResult<()> {
    let (channel_suffix, payload) = match event {
        TrainingEvent::Loss { .. }     => ("loss",     serde_json::to_string(event).unwrap()),
        TrainingEvent::Log { message } => ("logs",     message.clone()),
        TrainingEvent::Status { .. }   => ("status",   serde_json::to_string(event).unwrap()),
        TrainingEvent::Progress { .. } => ("progress", serde_json::to_string(event).unwrap()),
        TrainingEvent::Done { .. }     => ("status",   serde_json::to_string(event).unwrap()),
        TrainingEvent::Error { .. }    => ("status",   serde_json::to_string(event).unwrap()),
    };

    let channel = format!("job:{job_id}:{channel_suffix}");
    conn.publish::<_, _, ()>(&channel, &payload)
        .await
        .map_err(|e| AppError::Redis(format!("publish failed on {channel}: {e}")))?;

    Ok(())
}

/// Publish a plain log line (convenience wrapper)
pub async fn publish_log(
    conn:    &mut ConnectionManager,
    job_id:  &str,
    message: &str,
) -> AppResult<()> {
    publish_event(conn, job_id, &TrainingEvent::Log {
        message: message.to_string(),
    }).await
}

/// Publish a status change
pub async fn publish_status(
    conn:    &mut ConnectionManager,
    job_id:  &str,
    status:  crate::types::job::JobStatus,
) -> AppResult<()> {
    publish_event(conn, job_id, &TrainingEvent::Status { status }).await
}

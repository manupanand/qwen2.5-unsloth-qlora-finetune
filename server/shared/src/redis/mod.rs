use redis::{aio::ConnectionManager, AsyncCommands, Client};
use crate::errors::{AppError, AppResult};

pub mod queue;
pub mod pubsub;
pub mod session;

/// Create a Redis connection manager (auto-reconnects on drop)
pub async fn create_client(redis_url: &str) -> ConnectionManager {
    let client = Client::open(redis_url)
        .unwrap_or_else(|e| panic!("Invalid Redis URL: {e}"));
    ConnectionManager::new(client)
        .await
        .unwrap_or_else(|e| panic!("Failed to connect to Redis: {e}"))
}

/// Ping Redis — used in health checks
pub async fn health_check(conn: &mut ConnectionManager) -> bool {
    let result: redis::RedisResult<String> = redis::cmd("PING")
        .query_async(conn)
        .await;
    matches!(result, Ok(ref s) if s == "PONG")
}

/// SET key value EX ttl_secs
pub async fn set_ex(
    conn: &mut ConnectionManager,
    key:  &str,
    value: &str,
    ttl:  u64,
) -> AppResult<()> {
    conn.set_ex::<_, _, ()>(key, value, ttl)
        .await
        .map_err(|e| AppError::Redis(e.to_string()))
}

/// GET key
pub async fn get(conn: &mut ConnectionManager, key: &str) -> AppResult<Option<String>> {
    conn.get::<_, Option<String>>(key)
        .await
        .map_err(|e| AppError::Redis(e.to_string()))
}

/// DEL key
pub async fn del(conn: &mut ConnectionManager, key: &str) -> AppResult<()> {
    conn.del::<_, ()>(key)
        .await
        .map_err(|e| AppError::Redis(e.to_string()))
}

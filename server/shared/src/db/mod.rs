use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub mod users;
pub mod jobs;
pub mod datasets;

/// Create a PostgreSQL connection pool.
/// Called once at service startup.
pub async fn create_pool(database_url: &str) -> PgPool {
    PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .connect(database_url)
        .await
        .unwrap_or_else(|e| panic!("Failed to connect to PostgreSQL: {e}\nURL: {database_url}"))
}

/// Run a quick SELECT 1 to verify the pool is alive.
pub async fn health_check(pool: &PgPool) -> bool {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .is_ok()
}

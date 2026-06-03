// ── Finetune Studio — shared library ─────────────────────────────────
// All microservices depend on this crate.
// Add new modules here as they are built.

pub mod config;
pub mod db;
pub mod redis;
pub mod auth;
pub mod errors;
pub mod types;

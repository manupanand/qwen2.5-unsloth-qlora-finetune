// finetune-studio/server/services/gateway/src/routes/models.rs
// GET /api/v1/models       — scan MODEL_STORAGE_PATHS + built-in defaults
// GET /api/v1/models/scan  — force re-scan

use axum::{Router, routing::get, extract::State, Json};
use serde::Serialize;
use std::path::Path;
use crate::AppState;
use shared::errors::AppResult;

#[derive(Debug, Serialize, Clone)]
pub struct Model {
    pub id:          String,
    pub name:        String,
    pub variant:     String,
    pub params:      String,
    pub vram:        String,
    pub context:     String,
    pub path:        Option<String>,
    pub source:      String,
    pub description: String,
}

const BUILTIN: &[(&str, &str, &str, &str, &str, &str)] = &[
    ("mistral-7b",  "Mistral 7B",  "v0.3",        "7B",   "6 GB", "32k tokens"),
    ("llama3-8b",   "LLaMA 3",     "8B Instruct", "8B",   "6 GB", "8k tokens"),
    ("phi3-mini",   "Phi-3 Mini",  "3.8B",        "3.8B", "3 GB", "4k tokens"),
    ("gemma2-9b",   "Gemma 2",     "9B IT",       "9B",   "8 GB", "8k tokens"),
    ("qwen2.5-7b",  "Qwen 2.5",    "7B Instruct", "7B",   "6 GB", "128k tokens"),
];

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/models",      get(list_models))
        .route("/api/v1/models/scan", get(list_models))
}

async fn list_models(State(state): State<AppState>) -> AppResult<Json<serde_json::Value>> {
    let mut models: Vec<Model> = Vec::new();
    let mut scan_paths: Vec<String> = Vec::new();

    // ── Scan MODEL_STORAGE_PATHS ──────────────────────────────────
    for raw in state.cfg.model_storage_paths.split(',') {
        let base = raw.trim();
        if base.is_empty() { continue; }
        scan_paths.push(base.to_string());

        let root = Path::new(base);
        if !root.exists() { continue; }

        if let Ok(entries) = std::fs::read_dir(root) {
            for entry in entries.flatten() {
                let ep = entry.path();
                let is_model_dir = ep.is_dir() && (
                    ep.join("config.json").exists()          ||
                    ep.join("tokenizer.json").exists()       ||
                    ep.join("tokenizer_config.json").exists()
                );
                let is_gguf = ep.extension().map(|e| e == "gguf").unwrap_or(false);
                if !is_model_dir && !is_gguf { continue; }

                let file_name = ep.file_name()
                    .and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
                let display = read_model_name(&ep).unwrap_or_else(|| file_name.clone());

                models.push(Model {
                    id:          format!("local-{file_name}"),
                    name:        display.clone(),
                    variant:     String::new(),
                    params:      "?".into(),
                    vram:        "?".into(),
                    context:     "?".into(),
                    path:        Some(ep.to_string_lossy().to_string()),
                    source:      "local".into(),
                    description: format!("Found at {}", ep.display()),
                });
            }
        }
    }

    // ── Append built-in defaults not already found ────────────────
    let local_ids: std::collections::HashSet<_> =
        models.iter().map(|m| m.id.clone()).collect();

    for (id, name, variant, params, vram, context) in BUILTIN {
        if !local_ids.contains(*id) {
            models.push(Model {
                id:          id.to_string(),
                name:        name.to_string(),
                variant:     variant.to_string(),
                params:      params.to_string(),
                vram:        vram.to_string(),
                context:     context.to_string(),
                path:        None,
                source:      "builtin".into(),
                description: format!("{name} {variant} — will be downloaded on first training run"),
            });
        }
    }

    let total = models.len();
    Ok(Json(serde_json::json!({
        "models":     models,
        "scan_paths": scan_paths,
        "total":      total,
    })))
}

fn read_model_name(path: &Path) -> Option<String> {
    let text = std::fs::read_to_string(path.join("config.json")).ok()?;
    let val: serde_json::Value = serde_json::from_str(&text).ok()?;
    val.get("_name_or_path")
        .or_else(|| val.get("model_type"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

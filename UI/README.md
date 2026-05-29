# LoRA Studio

No-code LoRA fine-tuning UI. React frontend served by a Rust/Axum binary.

## Routes

| Path | What |
|---|---|
| `http://localhost:8000/agent/view/finetune-llm` | The UI |
| `http://localhost:8000/health` | Health check |
| `http://localhost:8000/` | Redirects → UI |

---

## Running

### Dev — Vite HMR (UI only, instant reload)
```bash
docker compose up dev
# → http://localhost:3000/agent/view/finetune-llm
```

### Production — full build, Rust serves everything
```bash
docker compose --profile prod up prod
# → http://localhost:8000/agent/view/finetune-llm
```

### Without Docker
```bash
# Build UI
npm install && npm run build          # → dist/

# Build & run Rust server
cd server
cargo run --release                   # listens on :8000
```

---

## Architecture

```
docker build
  ├── Stage 1: node:20-alpine   →  npm run build  →  dist/
  ├── Stage 2: rust:1.78-slim   →  cargo build    →  server binary
  └── Stage 3: debian:slim      →  binary + dist  =  final image (~80MB)
```

The Rust binary:
- Serves `dist/assets/*` as static files (hashed, cacheable)
- Falls back to `dist/index.html` for all `/agent/view/finetune-llm/*` paths (SPA routing)
- Exposes `/health` and stub `/api/v1/*` routes for Phase 2

---

## Phase 2: real training API

When the Candle/LoRA backend is ready, add to `server/src/main.rs`:

```
POST /api/v1/jobs          → start training job
GET  /api/v1/jobs/:id      → job status
GET  /api/v1/jobs/:id/stream  → SSE log stream
GET  /api/v1/jobs/:id/adapter → download safetensors
```

Set `VITE_API_BASE=/api/v1` in the UI env before building.

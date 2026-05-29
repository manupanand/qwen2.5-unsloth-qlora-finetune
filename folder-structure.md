lora-studio/
│
├── Dockerfile                  # multi-stage: Node builds UI → Rust builds server → final image
├── docker-compose.yml          # dev (Vite :3000) + prod (Axum :8000) profiles
├── .gitignore
├── README.md
│
├── ── UI (React + Vite) ──────────────────────────────────────────────
│
├── index.html                  # Vite entry point
├── vite.config.js              # base: '/agent/view/finetune-llm'
├── package.json
│
├── public/                     # static assets copied as-is to dist/
│
├── src/
│   ├── main.jsx                # ReactDOM.createRoot
│   ├── App.jsx                 # BrowserRouter + routes
│   ├── index.css               # global CSS vars, dark theme, fonts
│   │
│   ├── components/             # shared / reusable
│   │   ├── Sidebar.jsx         # 4-step workflow nav
│   │   └── UI.jsx              # Card, Btn, SliderField, Tag, InfoBox…
│   │
│   ├── pages/                  # one file per wizard step
│   │   ├── DatasetPage.jsx     # upload, parse, preview
│   │   ├── ModelPage.jsx       # base model picker
│   │   ├── TrainPage.jsx       # LoRA config + live loss chart + log
│   │   └── EvalPage.jsx        # chat + adapter download
│   │
│   ├── hooks/                  # (Phase 2) custom React hooks
│   │   ├── useTrainingJob.js   #   SSE stream → live loss/logs
│   │   └── useModels.js        #   fetch available models from API
│   │
│   └── api/                    # (Phase 2) typed API client
│       └── client.js           #   fetch wrappers for /api/v1/*
│
├── dist/                       # built output (git-ignored, copied into Docker image)
│
│
├── ── Backend (Rust + Axum) ──────────────────────────────────────────
│
└── server/
    ├── Cargo.toml              # axum, tokio, tower-http, dotenvy, serde
    ├── .env                    # local dev secrets (git-ignored)
    ├── .env.example            # committed template — document all vars here
    │
    └── src/
        ├── main.rs             # startup, router wiring, AppState
        ├── config.rs           # Config struct, env loading, secret redaction
        │
        ├── routes/             # (Phase 2) one file per API group
        │   ├── mod.rs
        │   ├── jobs.rs         #   POST /api/v1/jobs, GET /api/v1/jobs/:id
        │   ├── stream.rs       #   GET  /api/v1/jobs/:id/stream  (SSE)
        │   ├── models.rs       #   GET  /api/v1/models
        │   └── adapter.rs      #   GET  /api/v1/jobs/:id/adapter (download)
        │
        ├── training/           # (Phase 2) Candle / LoRA core
        │   ├── mod.rs
        │   ├── lora.rs         #   LoRA adapter injection + forward pass
        │   ├── trainer.rs      #   training loop, loss computation
        │   └── dataset.rs      #   JSONL/CSV loader, tokenisation
        │
        ├── db/                 # (Phase 2) database layer
        │   ├── mod.rs
        │   ├── jobs.rs         #   job CRUD (sqlx)
        │   └── schema.sql      #   table definitions
        │
        └── models/             # (Phase 2) base model download + caching
            ├── mod.rs
            └── hf.rs           #   HuggingFace Hub downloader (uses HF_TOKEN)

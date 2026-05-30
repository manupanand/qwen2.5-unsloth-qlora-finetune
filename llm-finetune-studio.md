# LLM Fine Tune Studio

A no-code fine-tuning studio for large language models. Built with **React + Vite** on the frontend and **Rust + Axum** on the backend. Designed for anyone — data scientists, researchers, and domain experts — to fine-tune LLMs without writing a single line of training code.

---

## What it is

LLM Fine Tune Studio is a full-stack web application that wraps the complexity of LoRA and QLoRA fine-tuning behind a clean, guided 4-step wizard. You bring your data. The studio handles the rest.

The backend is a single compiled Rust binary that serves both the API and the built React UI — no separate web server, no nginx in production, no Node.js runtime. One binary, one Docker image.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Rust, Axum 0.7, Tokio |
| Config | dotenvy (.env loading) |
| Serving | Axum static file server (serves `dist/`) |
| Containerisation | Docker multi-stage build |

---

## UI — what makes it different

### No-code fine-tuning wizard

The entire training workflow is a 4-step guided wizard. A user who has never seen a training script can go from raw data to a fine-tuned adapter in one session.

```
Step 1 — Dataset   →   Step 2 — Model   →   Step 3 — Fine-tune   →   Step 4 — Evaluate
```

Each step is isolated. State flows forward through the wizard and is held in React until job submission, at which point it persists to Redis (wizard session) and PostgreSQL (job record).

---

### Step 1 — Dataset

Three ways to load training data, selectable via a tab:

**Upload file** — drag-and-drop or browse. Accepts `.jsonl` and `.csv`. Parsed in-browser with instant row count, average length stats, and a 5-row preview table. No server round-trip for validation.

**HuggingFace dataset** — enter any public dataset ID (e.g. `unsloth/Radiology_mini`). Calls the HuggingFace datasets-server API directly from the browser. Supports `train` / `test` / `validation` splits. Auto-maps column names — `instruction`, `input`, `question`, `prompt` → instruction field; `output`, `response`, `answer`, `completion` → output field. Includes quick-pick chips for popular datasets.

**Sample data** — 5 curated instruction/output pairs to explore the workflow end-to-end without any data preparation.

After loading, shows: total rows, average character length, instruction coverage, output coverage, and a scrollable preview table.

---

### Step 2 — Model

Three model source tabs:

**Available models** — on page load, calls `GET /api/v1/models` with a 5-second timeout. If the backend responds, shows server-side models first (with a green "On server" badge). Falls back silently to 4 built-in defaults if the backend is offline. Includes a status bar (connecting → healthy → offline) and a manual refresh button.

**Local / custom path** — a form to register any local model by filesystem path or HuggingFace repo ID. Accepts absolute paths (`/models/llama3`), relative paths (`./models/my-model`), and HF repo IDs (`hf:meta-llama/Llama-3-8B`). Added models appear across both tabs. Removable with one click.

**Download & deploy** *(coming in Phase 2)* — placeholder tab showing planned deployment methods: HuggingFace Hub, NVIDIA NGC containers, Ollama, and vLLM/TGI. Dimmed cards with lock icons make it clear what's coming without breaking the UI.

Built-in model defaults:

| Model | Params | VRAM | Context |
|---|---|---|---|
| Mistral 7B v0.3 | 7B | 6 GB | 32k tokens |
| LLaMA 3 8B Instruct | 8B | 6 GB | 8k tokens |
| Phi-3 Mini | 3.8B | 3 GB | 4k tokens |
| Gemma 2 9B IT | 9B | 8 GB | 8k tokens |

---

### Step 3 — Fine-tune

**Training method selector** — a dropdown that switches between training methods. Each method is defined in a `METHODS` registry object. Adding a new method (PEFT, SFT, DPO, ORPO) requires only adding one entry to the registry — the selector, presets, config panels, chart colours, log messages, and start button all update automatically.

Supported methods:

| Method | Description | VRAM |
|---|---|---|
| **LoRA** | Full-precision adapter injection into attention layers | ~6 GB |
| **QLoRA** | 4-bit quantized base model + LoRA adapters on top | ~4 GB |
| PEFT | *(coming soon)* | — |
| SFT | *(coming soon)* | — |

**Preset system** — three presets per method (Quick ~10 min / Balanced ~1 hr / High quality ~3 hrs) that set all hyperparameters at once. Each method defines its own presets with appropriate defaults — QLoRA presets use smaller batch sizes to account for quantization overhead.

**LoRA config panel** — rank (r), alpha (α), and target module toggle chips (q_proj, v_proj, k_proj, o_proj, gate_proj, up_proj). Every chip is individually toggleable.

**QLoRA config panel** — adds quantization bits (4-bit / 8-bit), quantization type (nf4 / fp4, hidden when 8-bit is selected), compute dtype (bfloat16 / float16 / float32), double quantization toggle, nested quantization toggle.

**Shared training params** — learning rate, epochs, batch size, max sequence length. All sliders with live value display.

**Live training view** (simulated until Phase 2 API):
- Status bar with animated pulse dot, elapsed time, step counter, progress bar — all colour-coded to the active training method
- Loss curve chart (Recharts `LineChart`) — updates in real time, colour matches method
- Terminal log console — true black background, macOS traffic-light title bar, colour-coded log lines (green for success, blue for init, red for errors, dim for timestamps)

---

### Step 4 — Evaluate

- Chat interface to test the fine-tuned model before downloading
- Example prompt chips for quick testing
- Download adapter button (generates `adapter_model.safetensors` + `adapter_config.json`)
- Estimated adapter file size based on LoRA rank

---

### Dark / Light mode

Full dual-theme system using CSS custom properties and a `data-theme` attribute on the root element. Switching is instant — no flash. All components, charts, and the terminal log console adapt automatically.

Dark mode uses `#111827` (Tailwind cool-gray 900) as the base. Accent colour is `#2563EB` (blue-600) across both themes.

Toggle lives in the header — Sun/Moon pill button. Preference is held in React state (persists to localStorage in Phase 2).

---

### Design system

All UI primitives live in `src/components/UI.jsx`:

| Component | Description |
|---|---|
| `PageShell` | Page wrapper with title, subtitle, and actions slot |
| `Card` | Surface container with border and background |
| `Btn` | Pill-shaped button with primary / ghost / danger / success variants |
| `SliderField` | Labelled range slider with live value badge |
| `Tag` | Inline badge with accent / amber / red / blue / green colour variants |
| `InfoBox` | Contextual info panel (info / warning / success / error) |
| `Terminal` | Black terminal console with traffic-light header and colour-coded log lines |
| `Divider` | Horizontal rule |
| `SectionLabel` | Uppercase section heading |

---

## Backend — Rust + Axum

The backend is a single Axum server that:

- Serves the React `dist/` as static files under `/agent/view/finetune-llm/assets/`
- Falls back to `index.html` for all `/agent/view/finetune-llm/*` routes (SPA routing)
- Redirects bare `/` to the UI path
- Exposes `/health` returning live config values (no secrets)
- Exposes stub `/api/v1/*` routes (real training API in Phase 2)

All runtime config is loaded from `.env` via `dotenvy` into a typed `Config` struct at startup. Secrets are redacted from logs. The server panics immediately on startup if a required variable is missing — fail fast, never silently broken.

---

## Running

```bash
# Create shared Docker network (once)
docker network create shared-net

# Start infrastructure
docker compose -f infra-docker-compose.yml --env-file infra.env --profile infra up -d

# Initialise databases and storage (once)
docker compose -f infra-docker-compose.yml --env-file infra.env --profile init up --abort-on-container-exit

# Dev — Vite HMR on :3000
docker compose --profile dev up

# Production — Rust binary serves built UI on :8000
docker compose --profile prod up -d
```

UI is served at: `http://localhost:8000/agent/view/finetune-llm`

---

## Project structure

```
lora-studio/
├── Dockerfile                    # Multi-stage: Node → Rust → final ~80MB image
├── docker-compose.yml            # UI + server (dev / prod profiles)
├── infra-docker-compose.yml      # Redis, Qdrant, MinIO, Postgres + init containers
├── infra.env.example             # Infrastructure secrets template
├── server.env.example            # Server runtime config template
│
├── ui/                           # React frontend
│   ├── vite.config.js            # base: /agent/view/finetune-llm
│   ├── src/
│   │   ├── App.jsx               # BrowserRouter, theme state
│   │   ├── index.css             # Dark/light CSS custom properties
│   │   ├── components/
│   │   │   ├── Header.jsx        # Logo, dark/light toggle, user dropdown
│   │   │   ├── Sidebar.jsx       # 4-step workflow nav with progress state
│   │   │   └── UI.jsx            # Full design system (Btn, Card, Terminal…)
│   │   └── pages/
│   │       ├── DatasetPage.jsx   # Upload / HuggingFace / Sample tabs
│   │       ├── ModelPage.jsx     # Discover / Local / Download tabs
│   │       ├── TrainPage.jsx     # LoRA + QLoRA method selector + live chart
│   │       └── EvalPage.jsx      # Chat interface + adapter export
│
├── server/                       # Rust Axum backend
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs               # Router, startup, AppState
│       └── config.rs             # Typed Config, dotenvy, secret redaction
│
├── postgres-init/                # Creates lora_studio db + schema
├── redis-init/                   # Sets config keys + pub/sub schema
├── qdrant-init/                  # Creates vector collections + indexes
└── minio-init/                   # Creates buckets + lifecycle policies
```

---

## Infrastructure

| Service | Purpose |
|---|---|
| PostgreSQL | Jobs, users, datasets metadata, loss curves, eval metrics, adapter registry |
| Redis | Wizard session state, job queue, pub/sub channels (training logs/loss/status), auth tokens |
| Qdrant | Dataset embeddings for semantic search and deduplication |
| MinIO | Raw dataset files, training checkpoints, LoRA adapters, export bundles |

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 — UI | ✅ Complete | Full wizard, dark/light mode, HF dataset loading, method selector |
| 2 — API | 🔄 Next | Rust job routes, SSE streaming, Redis pub/sub, MinIO presigned URLs |
| 3 — Training | ⏳ Planned | Candle LoRA/QLoRA training loop, checkpoint management, eval metrics |
| 4 — Deploy | ⏳ Planned | HuggingFace Hub upload, Ollama, vLLM/TGI, NVIDIA NGC |

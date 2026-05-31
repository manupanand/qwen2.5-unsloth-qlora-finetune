# Architecture Plan
```
┌──────────────────────────────────────────────────────────────────┐
│  React UI  (:3000 dev / :8000 prod)                              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP / SSE
┌───────────────────────────▼──────────────────────────────────────┐
│  Rust Axum  — Studio Orchestrator (:8000)                        │
│  • Auth (JWT + SSO)                                              │
│  • Job lifecycle (create → queue → stream → complete)            │
│  • User management                                               │
│  • File upload → MinIO                                           │
│  • SSE: subscribes Redis pub/sub → pushes to browser             │
│  • Serves built UI in prod                                       │
└────┬──────────┬───────────┬──────────────┬───────────────────────┘
     │          │           │              │
┌────▼───┐ ┌───▼────┐ ┌────▼────┐ ┌──────▼──────┐
│Postgre │ │ Redis  │ │ MinIO   │ │   MLflow    │
│  SQL   │ │pub/sub │ │datasets │ │  tracking   │
│jobs    │ │queue   │ │adapters │ │  registry   │
│users   │ │session │ │weights  │ │  UI :5000   │
└────────┘ └────────┘ └────────┘ └─────────────┘
     │          │
     │    LPUSH queue:jobs
     │          │
┌────▼──────────▼──────────────────────────────────────────────────┐
│  Python Training Workers  (one container per method)             │
│                                                                  │
│  lora-worker                qlora-worker                         │
│  ├── Unsloth / TRL          ├── Unsloth 4-bit                    │
│  ├── HF Transformers        ├── bitsandbytes                     │
│  ├── DVC pipeline           ├── DVC pipeline                     │
│  ├── PUBLISH job:x:loss     ├── PUBLISH job:x:loss               │
│  ├── PUBLISH job:x:logs     ├── PUBLISH job:x:logs               │
│  └── mlflow.log_metric()    └── mlflow.log_metric()              │
│                                                                  │
│  peft-worker  (Phase 3)     sft-worker  (Phase 3)               │
└──────────────────────────────────────────────────────────────────┘
     │
┌────▼─────────────────┐
│  Qdrant              │
│  dataset embeddings  │
│  semantic search     │
└──────────────────────┘
```

## Plan end to end
```

1. User submits job (POST /api/v1/jobs)
        ↓
2. Rust writes job to PostgreSQL (status: queued)
   Rust writes wizard state snapshot to Redis
   Rust pushes job_id to Redis queue: LPUSH queue:jobs:lora pending
        ↓
3. lora-worker container is BRPOP-ing the queue
   It picks up the job_id
   Pulls dataset from MinIO
   Starts DVC pipeline (dataset hash → config hash → run)
   Starts Unsloth LoRA training loop
        ↓
4. Every training step:
   PUBLISH job:{id}:loss   {"step":10,"loss":1.23}
   PUBLISH job:{id}:logs   "[00:30] step 10/300 loss 1.23"
   mlflow.log_metric("loss", 1.23, step=10)
        ↓
5. Rust SSE handler is subscribed to job:{id}:*
   Forwards every message to the browser in real time
        ↓
6. Training completes:
   Adapter saved to MinIO
   MLflow run marked complete, adapter registered
   PUBLISH job:{id}:status "done"
   Rust updates PostgreSQL job status → done
        ↓
7. User downloads adapter via presigned MinIO URL

```
### Weekly plan
```
Week 1 — Core API + Auth
  ├── sqlx DB pool in Rust
  ├── JWT sign/verify + middleware
  ├── User register/login endpoints
  └── SSO (Google OAuth2)

Week 2 — Job system + Streaming
  ├── POST /api/v1/jobs → PostgreSQL + Redis queue
  ├── Redis pub/sub subscriber in Axum → SSE
  ├── GET /api/v1/jobs/:id (status polling)
  └── MinIO presigned URLs for upload/download

Week 3 — Python LoRA worker
  ├── lora-worker Dockerfile (Unsloth + TRL + DVC)
  ├── BRPOP job queue → run training
  ├── PUBLISH loss/logs to Redis
  └── Save adapter to MinIO

Week 4 — MLflow + QLoRA worker
  ├── MLflow container + Rust integration
  ├── qlora-worker Dockerfile
  └── DVC pipeline for reproducibility

Week 5 — UI integration + E2E
  ├── Replace all simulated UI data with real API calls
  ├── Dataset → model → train → eval full flow
  └── MLflow UI embedded or linked in Eval page

```

### TO check this architeture for finrtune

```
don't make one container per method. Make one container per compute environment. LoRA and QLoRA both run fine in the same Python container — the method is just a parameter. Separate containers make sense when the dependencies genuinely conflict (e.g. if you later add a JAX-based method or a llama.cpp-based method that needs different CUDA versions).

unsloth-worker   — LoRA, QLoRA, PEFT, SFT (all HuggingFace-based)
llamacpp-worker  — GGUF quantization + llama.cpp inference (Phase 4)
vllm-worker      — Production serving (Phase 5)

```

### Revised stucture

```

finetune-studio/
├── services/
│   ├── gateway/          ← API gateway + auth (port 8000)
│   ├── job-manager/      ← job lifecycle + queue (port 8001)
│   ├── stream-service/   ← SSE + Redis pub/sub (port 8002)
│   ├── model-registry/   ← model metadata + discovery (port 8003)
│   └── storage-service/  ← MinIO presigned URLs + file ops (port 8004)
│
├── shared/               ← shared Rust library (types, DB pool, errors)
│   └── Cargo.toml
│
├── workers/              ← Python training workers
│   ├── unsloth-worker/
│   └── llamacpp-worker/  (Phase 4)
│
└── ui/                   ← React frontend (existing)
```

# Full plan

---

## Rust microservices — full plan

```
finetune-studio/
├── services/
│   ├── gateway/          ← API gateway + auth (port 8000)
│   ├── job-manager/      ← job lifecycle + queue (port 8001)
│   ├── stream-service/   ← SSE + Redis pub/sub (port 8002)
│   ├── model-registry/   ← model metadata + discovery (port 8003)
│   └── storage-service/  ← MinIO presigned URLs + file ops (port 8004)
│
├── shared/               ← shared Rust library (types, DB pool, errors)
│   └── Cargo.toml
│
├── workers/              ← Python training workers
│   ├── unsloth-worker/
│   └── llamacpp-worker/  (Phase 4)
│
└── ui/                   ← React frontend (existing)
```

---

## Service responsibilities

### 1. Gateway (port 8000) — the only public-facing service

```
What it owns:
  ✓ Serves React UI dist/ (prod)
  ✓ JWT generation + verification
  ✓ SSO (Google / GitHub OAuth2)
  ✓ User register / login / profile
  ✓ Request routing to internal services
  ✓ Rate limiting per user
  ✓ CORS policy

What it does NOT do:
  ✗ Talk to DB directly for business logic (delegates to services)
  ✗ Handle training jobs
  ✗ Touch MinIO directly

Routes:
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  GET    /api/v1/auth/me
  GET    /oauth/google/callback
  GET    /oauth/github/callback

  /api/v1/jobs/*     → proxy to job-manager:8001
  /api/v1/models/*   → proxy to model-registry:8003
  /api/v1/files/*    → proxy to storage-service:8004
  /api/v1/stream/*   → proxy to stream-service:8002

DB tables used:
  users, user_sessions
```

---

### 2. Job Manager (port 8001) — the training orchestrator

```
What it owns:
  ✓ Create / cancel / retry jobs
  ✓ Write job to PostgreSQL
  ✓ Push job_id to Redis queue (LPUSH)
  ✓ Job status polling
  ✓ Hyperparameter validation
  ✓ Dataset validation (reads metadata from DB)
  ✓ Wizard state write to Redis on job submit

Routes:
  POST   /jobs                  create job
  GET    /jobs                  list jobs (user-scoped)
  GET    /jobs/:id              job detail + status
  DELETE /jobs/:id              cancel job
  POST   /jobs/:id/retry        retry failed job
  GET    /jobs/:id/logs         paginated log history
  GET    /jobs/:id/metrics      loss curve data points

DB tables used:
  jobs, loss_points, eval_metrics, datasets, wizard_submissions

Redis ops:
  LPUSH  queue:jobs:{method}    enqueue job
  SET    session:{uid}:wizard   save wizard snapshot
  GET    job:{id}:meta          runtime job metadata
```

---

### 3. Stream Service (port 8002) — SSE + pub/sub bridge

```
What it owns:
  ✓ Long-lived SSE connections from browser
  ✓ Subscribe to Redis pub/sub channels per job
  ✓ Forward Redis messages → SSE events to browser
  ✓ Connection registry (who is watching which job)
  ✓ Heartbeat / keepalive

Why it's separate:
  SSE connections are long-lived (hours during training).
  Keeping them in the gateway would hold threads/connections
  that affect API latency for all other users.
  Isolating means it can scale independently.

Routes:
  GET    /stream/jobs/:id        SSE stream for one job
  GET    /stream/user/:uid       SSE stream for user notifications

Redis channels subscribed:
  job:{id}:loss
  job:{id}:logs
  job:{id}:status
  job:{id}:progress
  user:{uid}:notify

SSE event types emitted:
  event: loss     data: {"step":10,"loss":1.23,"epoch":1}
  event: log      data: "[00:30] Epoch 1/3 loss 1.23"
  event: status   data: "running" | "done" | "failed"
  event: progress data: {"pct":34,"step":10,"total":300}
  event: ping     data: "" (keepalive every 15s)
```

---

### 4. Model Registry (port 8003)

```
What it owns:
  ✓ List available models on server (scan MODEL_STORAGE_PATH)
  ✓ Model metadata CRUD
  ✓ Adapter registry (versioned adapters per job)
  ✓ Download adapter (generates presigned URL via storage-service)
  ✓ MLflow integration (query experiment runs, metrics)
  ✓ Model comparison

Routes:
  GET    /models                  list available base models
  GET    /models/:id              model detail
  GET    /adapters                list all adapters (user-scoped)
  GET    /adapters/:id            adapter detail
  DELETE /adapters/:id            delete adapter
  GET    /adapters/:id/download   presigned download URL
  POST   /adapters/:id/deploy     mark as deployed

DB tables used:
  adapters, eval_metrics, jobs (read-only)

External:
  MLflow REST API (GET /api/2.0/mlflow/runs/search)
  storage-service (GET presigned URL)
```

---

### 5. Storage Service (port 8004)

```
What it owns:
  ✓ Presigned upload URLs (dataset files)
  ✓ Presigned download URLs (adapters, exports)
  ✓ Dataset file validation after upload
  ✓ Generate export bundles (zip adapter + config)
  ✓ Cleanup expired files
  ✓ File metadata sync → PostgreSQL

Why it's separate:
  MinIO client + presigned URL logic is security-sensitive.
  Keeping it isolated means only this service has MinIO credentials.
  All other services request URLs from storage-service.

Routes:
  POST   /files/upload-url       get presigned PUT URL for dataset
  POST   /files/upload-confirm   confirm upload done, validate file
  GET    /files/download/:key    get presigned GET URL
  POST   /files/export/:job_id   bundle adapter for download
  DELETE /files/:key             delete file (admin only)

DB tables used:
  datasets (write metadata after upload confirmed)

MinIO buckets accessed:
  lora-datasets, lora-adapters, lora-checkpoints, lora-exports
```

---

## Shared library (`shared/`)

```
shared/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── db/
    │   ├── mod.rs
    │   ├── pool.rs          ← sqlx PgPool setup + health check
    │   └── models/          ← DB row types (User, Job, Dataset...)
    │       ├── user.rs
    │       ├── job.rs
    │       ├── dataset.rs
    │       └── adapter.rs
    ├── redis/
    │   ├── mod.rs
    │   ├── client.rs        ← connection manager
    │   ├── queue.rs         ← LPUSH / BRPOP helpers
    │   └── pubsub.rs        ← PUBLISH / SUBSCRIBE helpers
    ├── errors/
    │   ├── mod.rs
    │   └── api_error.rs     ← unified ApiError → HTTP response
    ├── auth/
    │   ├── mod.rs
    │   ├── jwt.rs           ← sign / verify / claims
    │   └── middleware.rs    ← axum middleware extractor
    ├── config/
    │   └── mod.rs           ← shared Config struct (dotenvy)
    └── types/
        ├── mod.rs
        ├── jobs.rs          ← JobStatus, TrainingMethod enums
        └── events.rs        ← SSE event types
```

---

## Cargo workspace structure

```toml
# Cargo.toml (workspace root)
[workspace]
members = [
  "shared",
  "services/gateway",
  "services/job-manager",
  "services/stream-service",
  "services/model-registry",
  "services/storage-service",
]
resolver = "2"

[workspace.dependencies]
axum          = { version = "0.7", features = ["tokio"] }
tokio         = { version = "1",   features = ["full"] }
sqlx          = { version = "0.7", features = ["postgres","uuid","chrono","runtime-tokio"] }
redis         = { version = "0.25", features = ["tokio-comp","connection-manager"] }
tower-http    = { version = "0.5", features = ["fs","trace","cors"] }
serde         = { version = "1",   features = ["derive"] }
serde_json    = "1"
uuid          = { version = "1",   features = ["v4","serde"] }
chrono        = { version = "0.4", features = ["serde"] }
jsonwebtoken  = "9"
dotenvy       = "0.15"
tracing       = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
thiserror     = "1"
anyhow        = "1"
aws-sdk-s3    = "1"
```

---

## Service communication map

```
Browser
  │
  ▼
Gateway :8000  ←──────── serves UI, validates JWT on every request
  │
  ├──────────────────────────────────────────┐
  │                                          │
  ▼                                          ▼
job-manager :8001                    stream-service :8002
  │    │                                     │
  │    │ LPUSH                               │ SUBSCRIBE
  │    ▼                                     ▼
  │  Redis ──────────────────────────────── Redis
  │    queue:jobs:{method}                  job:{id}:loss
  │                                         job:{id}:logs
  │                                         job:{id}:status
  │
  ├──→ model-registry :8003
  │         │
  │         ├──→ MLflow :5000
  │         └──→ storage-service :8004
  │
  └──→ storage-service :8004
            │
            └──→ MinIO :9000

All services ──→ PostgreSQL :5432  (via shared PgPool)
```

---

## Docker Compose additions for services

```yaml
services:

  gateway:
    build: ./services/gateway
    container_name: lora-gateway
    ports: ["8000:8000"]
    env_file: server.env
    networks: [shared-net]
    depends_on: [job-manager, stream-service, model-registry, storage-service]

  job-manager:
    build: ./services/job-manager
    container_name: lora-job-manager
    ports: ["8001:8001"]        # internal only in prod
    env_file: server.env
    networks: [shared-net]

  stream-service:
    build: ./services/stream-service
    container_name: lora-stream
    ports: ["8002:8002"]
    env_file: server.env
    networks: [shared-net]

  model-registry:
    build: ./services/model-registry
    container_name: lora-model-registry
    ports: ["8003:8003"]
    volumes: ["./models:/models"]   # base model weights
    env_file: server.env
    networks: [shared-net]

  storage-service:
    build: ./services/storage-service
    container_name: lora-storage
    ports: ["8004:8004"]
    env_file: server.env
    networks: [shared-net]

  # Python training workers
  unsloth-worker:
    build: ./workers/unsloth-worker
    container_name: lora-unsloth-worker
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    env_file: server.env
    networks: [shared-net]

  # MLflow
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.12.1
    container_name: lora-mlflow
    command: mlflow server --host 0.0.0.0 --port 5000 --backend-store-uri postgresql://... --default-artifact-root s3://lora-adapters
    ports: ["5000:5000"]
    env_file: server.env
    networks: [shared-net]
```

---

## Build order for Phase 2

```
Week 1
  shared/          ← db pool, redis client, JWT, errors, types
  gateway/         ← auth endpoints, JWT middleware, UI serving

Week 2
  job-manager/     ← job CRUD, Redis queue push, validation
  stream-service/  ← SSE + Redis sub bridge

Week 3
  storage-service/ ← MinIO presigned URLs, upload confirm
  model-registry/  ← model scan, adapter CRUD, MLflow query

Week 4
  unsloth-worker/  ← Python, Unsloth, DVC, Redis BRPOP/PUBLISH
  mlflow/          ← wire up tracking + artifact store to MinIO

Week 5
  UI integration   ← replace all mock data with real API calls
  E2E test         ← full dataset → train → eval flow
```

---

### changes

 **`finetune-studio/`** everywhere from now on — no more `lora-studio`.

Quick rename map so I stay consistent:

```
lora-studio/          →  finetune-studio/
lora-studio-v2/       →  finetune-studio/
lora-redis            →  finetune-redis
lora-qdrant           →  finetune-qdrant
lora-minio            →  finetune-minio
postgres-db               →  postgres-db  (yours, keep as-is)
lora_studio (db)      →  finetune_studio
lora_user (db user)   →  finetune_user
lora-datasets         →  finetune-datasets
lora-adapters         →  finetune-adapters
lora-checkpoints      →  finetune-checkpoints
lora-exports          →  finetune-exports
lora-gateway          →  finetune-gateway
lora-job-manager      →  finetune-job-manager
lora-stream           →  finetune-stream
lora-model-registry   →  finetune-model-registry
lora-storage          →  finetune-storage
lora-unsloth-worker   →  finetune-unsloth-worker
lora_studio_server    →  finetune_studio_server  (Rust crate name)
```

Project root:
```
finetune-studio/
├── ui/
├── services/
│   ├── gateway/
│   ├── job-manager/
│   ├── stream-service/
│   ├── model-registry/
│   └── storage-service/
├── shared/
├── workers/
│   └── unsloth-worker/
├── postgres-init/
├── redis-init/
├── qdrant-init/
├── minio-init/
├── docker-compose.yml
├── infra-docker-compose.yml
├── Dockerfile
├── server.env
└── infra.env
```



## Plan for  tomorrow

The `shared` crate first — everything depends on it:

```
shared/src/db/pool.rs      ← PgPool from DATABASE_URL
shared/src/redis/client.rs ← Redis ConnectionManager
shared/src/auth/jwt.rs     ← sign/verify with jsonwebtoken
shared/src/errors/         ← ApiError → axum IntoResponse
shared/src/types/          ← Job, User, JobStatus structs
```

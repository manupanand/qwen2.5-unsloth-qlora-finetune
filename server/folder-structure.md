```
finetune-studio/
├── Dockerfile                        ← builds ui/ + server/services/gateway
├── docker-compose.yml
│
├── ui/                               ← React frontend (unchanged)
│
└── server/                           ← ALL Rust lives here
    ├── Cargo.toml                    ← workspace root
    │
    ├── shared/                       ← foundation crate
    │   └── src/
    │       ├── lib.rs
    │       ├── config.rs             ← all env vars, typed
    │       ├── errors/mod.rs         ← AppError → HTTP response
    │       ├── auth/
    │       │   ├── jwt.rs            ← sign/verify access + refresh tokens
    │       │   ├── middleware.rs     ← AuthUser axum extractor
    │       │   └── password.rs      ← bcrypt hash/verify
    │       ├── db/
    │       │   ├── mod.rs           ← PgPool setup
    │       │   ├── users.rs         ← user CRUD queries
    │       │   ├── jobs.rs          ← job CRUD queries
    │       │   └── datasets.rs      ← dataset queries
    │       ├── redis/
    │       │   ├── mod.rs           ← ConnectionManager setup
    │       │   ├── queue.rs         ← LPUSH/BRPOP job queue
    │       │   ├── pubsub.rs        ← PUBLISH training events
    │       │   └── session.rs       ← wizard state GET/SET
    │       └── types/
    │           ├── user.rs          ← User, UserRole, UserPublic
    │           ├── job.rs           ← Job, JobStatus, TrainingMethod, TrainingEvent
    │           ├── dataset.rs       ← Dataset, DatasetFormat, DatasetStatus
    │           └── adapter.rs       ← Adapter (model registry)
    │
    └── services/
        ├── gateway/                 ← the only public-facing service
        ├── job-manager/             ← stub
        ├── stream-service/          ← stub
        ├── model-registry/          ← stub
        └── storage-service/         ← stub

```

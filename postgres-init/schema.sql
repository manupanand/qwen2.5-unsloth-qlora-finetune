-- ═══════════════════════════════════════════════════════════════════════
-- LoRA Studio — PostgreSQL Schema
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Safe to re-run on an existing database.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  role             TEXT        NOT NULL DEFAULT 'user'
                               CHECK (role IN ('admin', 'user', 'viewer')),
  password_hash    TEXT,                           -- null if SSO only
  hf_token_enc     TEXT,                           -- encrypted HF token
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- ─────────────────────────────────────────────────────────────────────
-- USER SESSIONS (auth tokens)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash    TEXT        NOT NULL UNIQUE,       -- hashed bearer token
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions (expires_at);

-- ─────────────────────────────────────────────────────────────────────
-- DATASETS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datasets (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  description        TEXT,
  format             TEXT        NOT NULL CHECK (format IN ('jsonl', 'csv', 'txt')),
  -- MinIO storage references
  bucket             TEXT        NOT NULL,
  raw_file_path      TEXT        NOT NULL,         -- original uploaded file
  processed_file_path TEXT,                        -- cleaned/validated file
  -- Stats (populated after validation)
  row_count          INTEGER,
  avg_input_length   INTEGER,
  avg_output_length  INTEGER,
  file_size_bytes    BIGINT,
  -- Qdrant vector indexing
  embedding_indexed  BOOLEAN     NOT NULL DEFAULT FALSE,
  qdrant_collection  TEXT,
  -- Status
  status             TEXT        NOT NULL DEFAULT 'uploaded'
                                 CHECK (status IN ('uploaded', 'validating', 'ready', 'error')),
  error_msg          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets (user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status  ON datasets (status);
CREATE INDEX IF NOT EXISTS idx_datasets_created ON datasets (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- TRAINING JOBS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  dataset_id      UUID        NOT NULL REFERENCES datasets (id),
  -- Model config
  base_model      TEXT        NOT NULL,            -- mistral-7b | llama3-8b | phi3-mini | gemma2-9b
  method          TEXT        NOT NULL             -- lora | qlora | peft | sft
                              CHECK (method IN ('lora', 'qlora', 'peft', 'sft', 'dpo', 'orpo')),
  -- Hyperparameters stored as JSONB — flexible per method
  hyperparams     JSONB       NOT NULL DEFAULT '{}',
  -- Example hyperparams for lora:
  --   {"loraRank":16,"loraAlpha":32,"learningRate":0.0002,"epochs":3,
  --    "batchSize":4,"maxSeqLen":512,"targetModules":["q_proj","v_proj"]}
  -- Additional method-specific config (quantization etc)
  method_cfg      JSONB       NOT NULL DEFAULT '{}',
  -- Example method_cfg for qlora:
  --   {"quantBits":"4-bit","quantType":"nf4","computeDtype":"bfloat16",
  --    "doubleQuant":true,"nestedQuant":false}
  -- Job lifecycle
  status          TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued','running','done','failed','stopped')),
  queue_position  INTEGER,                         -- position when queued
  current_step    INTEGER     NOT NULL DEFAULT 0,
  total_steps     INTEGER,
  current_epoch   INTEGER     NOT NULL DEFAULT 0,
  total_epochs    INTEGER,
  current_loss    FLOAT,
  best_loss       FLOAT,
  -- Timing
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  -- Error info
  error_msg       TEXT,
  error_detail    JSONB,
  -- Redis pub/sub channel names (denormalised for convenience)
  redis_channel   TEXT GENERATED ALWAYS AS ('job:' || id::text) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id    ON jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_dataset_id ON jobs (dataset_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created    ON jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_method     ON jobs (method);
-- For queue ordering
CREATE INDEX IF NOT EXISTS idx_jobs_queued     ON jobs (queued_at) WHERE status = 'queued';

-- ─────────────────────────────────────────────────────────────────────
-- LOSS POINTS  (append-only time-series per job)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loss_points (
  job_id    UUID    NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  step      INTEGER NOT NULL,
  epoch     INTEGER NOT NULL,
  loss      FLOAT   NOT NULL,
  lr        FLOAT,                                 -- learning rate at this step
  gpu_mem_gb FLOAT,                               -- GPU memory used
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, step)
);

CREATE INDEX IF NOT EXISTS idx_loss_job_id ON loss_points (job_id);
-- Useful for plotting by epoch
CREATE INDEX IF NOT EXISTS idx_loss_epoch  ON loss_points (job_id, epoch);

-- ─────────────────────────────────────────────────────────────────────
-- EVAL METRICS  (written once after training completes)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_metrics (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID        NOT NULL UNIQUE REFERENCES jobs (id) ON DELETE CASCADE,
  -- Standard NLP metrics
  perplexity        FLOAT,
  bleu              FLOAT,
  rouge_1           FLOAT,
  rouge_2           FLOAT,
  rouge_l           FLOAT,
  -- Custom benchmark results (array of {prompt, expected, actual, score})
  benchmark_results JSONB       DEFAULT '[]',
  -- Timing
  eval_duration_secs INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_job_id ON eval_metrics (job_id);
-- For finding best models
CREATE INDEX IF NOT EXISTS idx_eval_perplexity ON eval_metrics (perplexity);

-- ─────────────────────────────────────────────────────────────────────
-- ADAPTERS  (LoRA adapter outputs — model registry)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adapters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID        NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  version          INTEGER     NOT NULL DEFAULT 1,
  -- MinIO storage
  bucket           TEXT        NOT NULL,
  adapter_path     TEXT        NOT NULL,           -- adapter_model.safetensors
  config_path      TEXT        NOT NULL,           -- adapter_config.json
  tokenizer_path   TEXT,                           -- tokenizer_config.json
  gguf_path        TEXT,                           -- quantized export if done
  -- Metadata
  file_size_mb     FLOAT,
  base_model       TEXT        NOT NULL,
  method           TEXT        NOT NULL,
  -- Deployment
  is_deployed      BOOLEAN     NOT NULL DEFAULT FALSE,
  deployed_at      TIMESTAMPTZ,
  -- Eval score (denormalised from eval_metrics for quick listing)
  perplexity       FLOAT,
  bleu             FLOAT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adapters_job_version ON adapters (job_id, version);
CREATE INDEX IF NOT EXISTS idx_adapters_user_id   ON adapters (user_id);
CREATE INDEX IF NOT EXISTS idx_adapters_deployed  ON adapters (is_deployed);
CREATE INDEX IF NOT EXISTS idx_adapters_base_model ON adapters (base_model);

-- ─────────────────────────────────────────────────────────────────────
-- WIZARD SESSION AUDIT  (optional — log wizard completions)
-- Redis holds live wizard state; this logs when a job is actually submitted
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wizard_submissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  job_id       UUID        REFERENCES jobs (id) ON DELETE SET NULL,
  wizard_state JSONB       NOT NULL,               -- snapshot of Redis wizard state
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wizard_user_id ON wizard_submissions (user_id);

-- ─────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  job_id     UUID        REFERENCES jobs (id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('job_done','job_failed','job_queued','system')),
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at via trigger
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  -- users
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  -- datasets
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_datasets_updated_at') THEN
    CREATE TRIGGER trg_datasets_updated_at
      BEFORE UPDATE ON datasets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  -- jobs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_updated_at') THEN
    CREATE TRIGGER trg_jobs_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- SEED DATA  (admin user — change password immediately after init)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO users (email, name, role, password_hash)
VALUES (
  'admin@lora-studio.local',
  'Admin',
  'admin',
  -- bcrypt hash of 'changeme' — CHANGE THIS IMMEDIATELY
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/POwFm4S'
)
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- Summary of tables created:
--   users               — accounts and roles
--   user_sessions       — auth tokens
--   datasets            — uploaded training data metadata
--   jobs                — training job records + hyperparams (JSONB)
--   loss_points         — per-step loss time-series
--   eval_metrics        — post-training evaluation scores
--   adapters            — exported LoRA adapter registry
--   wizard_submissions  — audit log of job submissions
--   notifications       — in-app notification feed
-- ─────────────────────────────────────────────────────────────────────

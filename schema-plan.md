-- Users
users
  id uuid PK
  email text UNIQUE
  name text
  role text          -- admin | user
  hf_token_enc text  -- encrypted
  created_at timestamptz

-- Datasets
datasets
  id uuid PK
  user_id uuid FK→users
  name text
  file_path text     -- points to file storage
  format text        -- jsonl | csv
  row_count int
  avg_length int
  embedding_indexed bool
  created_at timestamptz

-- Training jobs
jobs
  id uuid PK
  user_id uuid FK→users
  dataset_id uuid FK→datasets
  base_model text    -- mistral-7b | llama3-8b | phi3-mini
  method text        -- lora | qlora | peft | sft
  status text        -- queued | running | done | failed | stopped
  hyperparams jsonb  -- {loraRank, loraAlpha, lr, epochs, ...}
  method_cfg  jsonb  -- {quantBits, quantType, ...} (method-specific)
  started_at timestamptz
  finished_at timestamptz
  error_msg text
  created_at timestamptz

-- Loss curve (append-only during training)
loss_points
  job_id uuid FK→jobs
  step int
  loss float
  epoch int
  lr float
  PRIMARY KEY (job_id, step)

-- Eval metrics (written once after training)
eval_metrics
  id uuid PK
  job_id uuid FK→jobs
  bleu float
  rouge_1 float
  rouge_l float
  perplexity float
  benchmark_prompts jsonb  -- [{prompt, response, score}]
  created_at timestamptz

-- Adapter / model registry
adapters
  id uuid PK
  job_id uuid FK→jobs
  version int
  file_path text     -- points to file storage
  file_size_mb float
  quantized bool
  quant_format text  -- safetensors | gguf
  deployed bool
  deployed_at timestamptz
  created_at timestamptz

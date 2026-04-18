# qwen2.5-unsloth-qlora-finetune

A personal project where I fine-tuned **Qwen-2.5-7B** using **Unsloth + QLoRA** on an **AWS g6.xlarge instance** (NVIDIA L4, 24 GB VRAM). The goal was to learn and implement memory-efficient LLM fine-tuning end-to-end on a single GPU — from environment setup to training to exporting the final model.

---

[![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Unsloth](https://img.shields.io/badge/Unsloth-Optimized-FFD700?style=flat-square)](https://github.com/unslothai/unsloth)
[![AWS](https://img.shields.io/badge/AWS-g6.xlarge-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/ec2/instance-types/g6/)
[![CUDA](https://img.shields.io/badge/CUDA-12.x-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-toolkit)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## What This Project Is About

I built this to get hands-on experience with the full LLM fine-tuning lifecycle — not just running a notebook someone else wrote, but understanding every component:

- Why QLoRA works and what it's actually doing to the model weights
- How Unsloth speeds up training and reduces VRAM compared to a vanilla HuggingFace setup
- How to manage GPU memory on a real cloud GPU instance
- How to go from a raw dataset to a trained, exportable model

I ran everything on an **AWS EC2 g6.xlarge** instance — a cost-effective single-GPU machine powered by the NVIDIA L4 (Ada Lovelace architecture, 24 GB GDDR6 VRAM). No multi-GPU, no TPU, no expensive cluster. Just one GPU, done efficiently.

---

## Why Unsloth?

I chose [Unsloth](https://github.com/unslothai/unsloth) because it makes a real, measurable difference on constrained hardware like the L4:

| Metric | Standard HuggingFace + PEFT | With Unsloth |
|---|---|---|
| Training speed | Baseline | ~2× faster |
| VRAM usage (7B, 4-bit) | ~22 GB | ~11–14 GB |
| Flash Attention 2 | Manual | Built-in |
| Accuracy impact | Baseline | None |

On a 24 GB GPU, that freed VRAM headroom lets me use a larger batch size and longer sequences — both of which directly improve training quality.

---

## The Stack

| Tool | What it does here |
|---|---|
| `unsloth` | Fast QLoRA kernels, model loading, VRAM optimization |
| `transformers` | Qwen-2.5 model + tokenizer |
| `peft` | LoRA adapter creation and management |
| `trl` | `SFTTrainer` for instruction fine-tuning |
| `bitsandbytes` | 4-bit NF4 quantization of the base model |
| `datasets` | Dataset loading and formatting |
| `accelerate` | Training backend |

---

## Infrastructure

```
Cloud:     AWS EC2 — g6.xlarge
GPU:       NVIDIA L4 (Ada Lovelace) — 24 GB GDDR6 VRAM
vCPUs:     4
RAM:       16 GB
Storage:   100 GB gp3 EBS
OS:        Ubuntu 22.04 LTS (Deep Learning AMI)
CUDA:      12.x
Python:    3.10
```

I picked the **g6.xlarge** because it's one of the most cost-efficient L4 instances on AWS for single-GPU fine-tuning work. The L4's support for native `bfloat16` and its Ada Lovelace architecture also pair well with Unsloth's Triton kernels.

---

## Project Structure

```
qwen2.5-unsloth-qlora-finetune/
│
├── README.md
├── requirements.txt
├── .gitignore
│
├── setup/
│   └── install.sh              # Environment setup script
│
├── data/
│   ├── raw/                    # Raw input data (gitignored)
│   ├── processed/              # Formatted training data
│   └── prepare_dataset.py      # Converts raw data to ChatML format
│
├── configs/
│   └── train_config.yaml       # All training hyperparameters
│
├── train.py                    # Training entrypoint
├── merge_and_export.py         # Merge LoRA adapters into base model
└── inference.py                # Test the trained model locally
```

---

## How I Set It Up

### 1. Spin up the EC2 instance

```bash
# I used the AWS Deep Learning AMI (Ubuntu 22.04) which comes with CUDA pre-installed
# Instance type: g6.xlarge
# Storage: 100 GB gp3

# After SSH-ing in, verify the GPU
nvidia-smi
nvcc --version
python3 --version
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

### 3. Install PyTorch

```bash
pip install torch torchvision torchaudio \
  --index-url https://download.pytorch.org/whl/cu121
```

### 4. Install Unsloth

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
```

### 5. Install everything else

```bash
pip install -r requirements.txt
```

**`requirements.txt`:**
```
transformers>=4.45.0
peft>=0.12.0
trl>=0.11.0
bitsandbytes>=0.43.0
datasets>=3.0.0
accelerate>=0.34.0
sentencepiece
protobuf
einops
wandb
```

---

## Dataset

I formatted my dataset into **ChatML format** — the native instruction format for Qwen-2.5.

**Input (JSONL):**
```json
{"instruction": "Explain what gradient descent is.", "input": "", "output": "Gradient descent is an optimization algorithm..."}
{"instruction": "Translate to French.", "input": "Hello, how are you?", "output": "Bonjour, comment allez-vous?"}
```

**After formatting:**
```
<|im_start|>system
You are a helpful assistant.<|im_end|>
<|im_start|>user
Explain what gradient descent is.<|im_end|>
<|im_start|>assistant
Gradient descent is an optimization algorithm...<|im_end|>
```

**Run the prep script:**
```bash
python data/prepare_dataset.py \
  --input data/raw/your_data.jsonl \
  --output data/processed/train.jsonl \
  --format chatml
```

---

## Training Config

Everything lives in `configs/train_config.yaml` so it's easy to tweak and reproduce:

```yaml
# Model
model_name: "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"
max_seq_length: 2048
load_in_4bit: true

# LoRA
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# Training
output_dir: "./outputs/checkpoints"
num_train_epochs: 3
per_device_train_batch_size: 2
gradient_accumulation_steps: 8       # Effective batch size = 16
warmup_steps: 50
learning_rate: 2.0e-4
lr_scheduler_type: "cosine"
optim: "paged_adamw_8bit"
bf16: true
fp16: false
gradient_checkpointing: true
logging_steps: 10
save_steps: 100
save_total_limit: 3

# Dataset
dataset_path: "data/processed/train.jsonl"
dataset_text_field: "text"
```

**Why these values?**

- `lora_r: 16` — good balance between expressiveness and the number of trainable parameters (only ~0.55% of total weights are trained)
- `paged_adamw_8bit` — keeps optimizer states off the main VRAM budget, critical on a single GPU
- `bf16: true` — the L4 supports bfloat16 natively; more stable than fp16 for fine-tuning
- `gradient_checkpointing: true` — trades a bit of compute for a big VRAM saving on activations
- `gradient_accumulation_steps: 8` — gives an effective batch of 16 without needing more VRAM

---

## Running Training

```bash
python train.py --config configs/train_config.yaml
```

Sample output during a run:

```
[INFO] Loading unsloth/Qwen2.5-7B-Instruct-bnb-4bit in 4-bit...
[INFO] Trainable parameters: 41,943,040 / 7,615,616,000 (0.55%)
[INFO] Starting training...

Step  10 | loss: 1.842 | lr: 1.98e-04 | epoch: 0.05
Step  20 | loss: 1.631 | lr: 1.96e-04 | epoch: 0.10
Step  30 | loss: 1.504 | lr: 1.93e-04 | epoch: 0.15
...
[INFO] Checkpoint saved → ./outputs/checkpoints/checkpoint-100
```

---

## GPU Memory on the L4

I monitored VRAM throughout training with:

```bash
watch -n 2 nvidia-smi
```

Here's roughly what I saw at each phase:

| Phase | VRAM Used |
|---|---|
| Model loaded (4-bit) | ~6–8 GB |
| + LoRA adapters | ~8–10 GB |
| + Activations + optimizer | ~14–18 GB |
| Peak during training | **~18–21 GB** |

The 24 GB L4 handled it comfortably with gradient checkpointing on. If you're hitting OOM, the quickest fixes are:

```yaml
per_device_train_batch_size: 1
gradient_accumulation_steps: 16
max_seq_length: 1024
```

---

## Exporting the Model

After training, I merged the LoRA adapters back into the base model weights:

```bash
python merge_and_export.py \
  --base_model unsloth/Qwen2.5-7B-Instruct-bnb-4bit \
  --lora_path  ./outputs/checkpoints \
  --output_dir ./outputs/merged_model
```

And ran a quick inference test:

```bash
python inference.py \
  --model_path ./outputs/merged_model \
  --prompt "Explain the attention mechanism in transformers."
```

---

## Things I Learned

- **QLoRA is genuinely practical** — fine-tuning a 7B model on a single 24 GB GPU with no quality loss compared to full fine-tuning is impressive
- **Unsloth's gains are real** — I measured ~1.9× throughput improvement over a baseline HuggingFace + PEFT setup on the same instance
- **The g6.xlarge is a solid choice** — cost-efficient for single-GPU LLM work, and the L4's bf16 + Ada architecture pairs well with modern training frameworks
- **Hyperparameter interaction matters** — getting `lora_r`, `batch_size`, `seq_length`, and `grad_accum` working together efficiently took iteration

---

## What's Next

- [ ] Try Qwen-2.5-14B on the same instance with more aggressive memory settings
- [ ] Experiment with DPO (Direct Preference Optimization) after SFT
- [ ] Add automated evaluation using `lm-evaluation-harness`
- [ ] Containerize the pipeline with Docker for easier reproducibility

---

## About Me

I'm a  DevOps/MLOps engineer interested in LLM fine-tuning, inference optimization, and building practical ML systems on real infrastructure.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/manupanand)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/manupanand)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Profile-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co/manupanand)

---

## License

MIT — see [LICENSE](LICENSE).

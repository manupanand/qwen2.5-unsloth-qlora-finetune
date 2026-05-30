#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# qdrant-init/init.sh
# Creates Qdrant collections via REST API using curl.
# Plain HTTP — no SSL, no Python client.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

QDRANT_HOST="${QDRANT_HOST:-lora-qdrant}"
QDRANT_PORT="${QDRANT_PORT:-6333}"
QDRANT_API_KEY="${QDRANT_API_KEY:-}"

BASE_URL="http://${QDRANT_HOST}:${QDRANT_PORT}"

# Build auth header if API key is set
AUTH_HEADER=""
if [[ -n "${QDRANT_API_KEY}" ]]; then
  AUTH_HEADER="api-key: ${QDRANT_API_KEY}"
fi

echo "═══════════════════════════════════════"
echo "  LoRA Studio — Qdrant init"
echo "  URL: ${BASE_URL}"
echo "═══════════════════════════════════════"

# ── Helper: curl with optional auth ──────────────────────────────────
qdrant_curl() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [[ -n "${AUTH_HEADER}" ]]; then
    if [[ -n "${data}" ]]; then
      curl -sf -X "${method}" \
        -H "Content-Type: application/json" \
        -H "${AUTH_HEADER}" \
        -d "${data}" \
        "${BASE_URL}${path}"
    else
      curl -sf -X "${method}" \
        -H "${AUTH_HEADER}" \
        "${BASE_URL}${path}"
    fi
  else
    if [[ -n "${data}" ]]; then
      curl -sf -X "${method}" \
        -H "Content-Type: application/json" \
        -d "${data}" \
        "${BASE_URL}${path}"
    else
      curl -sf -X "${method}" \
        "${BASE_URL}${path}"
    fi
  fi
}

# ── Wait for Qdrant ───────────────────────────────────────────────────
echo ""
echo "⏳  Waiting for Qdrant at ${BASE_URL}..."
for i in $(seq 1 30); do
  if curl -sf "${BASE_URL}/healthz" > /dev/null 2>&1; then
    echo "✓   Qdrant is up."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "❌  Timed out waiting for Qdrant."
    exit 1
  fi
  echo "    attempt $i/30 — retrying in 2s..."
  sleep 2
done

# ── Helper: create collection if not exists ────────────────────────────
create_collection() {
  local name="$1"
  local vector_size="$2"
  local distance="$3"
  local description="$4"

  echo ""
  echo "── Collection: ${name}"

  # Check if already exists
  if qdrant_curl GET "/collections/${name}" > /dev/null 2>&1; then
    echo "✓   Already exists — skipping."
    return 0
  fi

  # Create it
  local payload
  payload=$(cat << JSON
{
  "vectors": {
    "size": ${vector_size},
    "distance": "${distance}",
    "on_disk": false
  },
  "optimizers_config": {
    "indexing_threshold": 20000,
    "memmap_threshold": 50000
  },
  "hnsw_config": {
    "m": 16,
    "ef_construct": 100,
    "full_scan_threshold": 10000
  },
  "on_disk_payload": true
}
JSON
)

  if qdrant_curl PUT "/collections/${name}" "${payload}" > /dev/null; then
    echo "✓   Created (${vector_size}d, ${distance}). ${description}"
  else
    echo "❌  Failed to create collection '${name}'"
    exit 1
  fi
}

# ── Helper: create payload index ──────────────────────────────────────
create_index() {
  local collection="$1"
  local field="$2"
  local field_type="$3"  # keyword | integer | float | bool

  local payload="{\"field_name\": \"${field}\", \"field_schema\": \"${field_type}\"}"

  if qdrant_curl PUT "/collections/${collection}/index" "${payload}" > /dev/null 2>&1; then
    echo "    ✓ index: ${field} (${field_type})"
  else
    echo "    - index '${field}' skipped (may already exist)"
  fi
}

# ─────────────────────────────────────────────────────────────────────
# Step 1: Create collections
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Step 1: Creating collections..."

# Dataset chunks — all-MiniLM-L6-v2 (384 dims)
# Used for: semantic search, deduplication across dataset rows
create_collection \
  "dataset_chunks" \
  384 \
  "Cosine" \
  "Dataset instruction/output pairs for semantic search"

# Adapter evals — text-embedding-3-small (1536 dims)
# Used for: comparing fine-tuned model outputs
create_collection \
  "adapter_evals" \
  1536 \
  "Cosine" \
  "Adapter evaluation embeddings for model comparison"

# ─────────────────────────────────────────────────────────────────────
# Step 2: Create payload indexes for fast filtered search
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Step 2: Creating payload indexes..."

echo "  dataset_chunks indexes:"
create_index "dataset_chunks" "dataset_id" "keyword"
create_index "dataset_chunks" "user_id"    "keyword"
create_index "dataset_chunks" "row_index"  "integer"

echo "  adapter_evals indexes:"
create_index "adapter_evals" "adapter_id" "keyword"
create_index "adapter_evals" "job_id"     "keyword"
create_index "adapter_evals" "user_id"    "keyword"
create_index "adapter_evals" "base_model" "keyword"
create_index "adapter_evals" "method"     "keyword"

# ─────────────────────────────────────────────────────────────────────
# Step 3: Verify
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Step 3: Verification..."
COLLECTIONS=$(qdrant_curl GET "/collections")
echo "    Collections: $(echo "${COLLECTIONS}" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//' | tr '\n' ' ')"

echo ""
echo "═══════════════════════════════════════"
echo "  ✓  Qdrant init complete!"
echo "     dashboard: http://${QDRANT_HOST}:${QDRANT_PORT}/dashboard"
echo "═══════════════════════════════════════"

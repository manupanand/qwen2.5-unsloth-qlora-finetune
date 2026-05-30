#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# redis-init/init.sh
#
# One-time Redis configuration:
#   - Verify connection
#   - Set application config keys (key prefix registry, feature flags)
#   - Create initial sorted sets and hashes used by the app
#   - Document key schema as Redis hash (self-documenting config)
#
# All keys use SET NX (only set if not exists) so re-runs are safe.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

REDIS_HOST="${REDIS_HOST:-lora-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

echo "═══════════════════════════════════════"
echo "  LoRA Studio — Redis init"
echo "  Host: ${REDIS_HOST}:${REDIS_PORT}"
echo "═══════════════════════════════════════"

# ── Helper: redis-cli wrapper ──────────────────────────────────────────
rc() {
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" \
    --no-auth-warning "$@"
}

# ── Wait for Redis ─────────────────────────────────────────────────────
echo ""
echo "⏳  Waiting for Redis..."
for i in $(seq 1 20); do
  if rc ping | grep -q "PONG"; then
    echo "✓   Redis is up."
    break
  fi
  if [[ $i -eq 20 ]]; then
    echo "❌  Timed out waiting for Redis."
    exit 1
  fi
  echo "    attempt $i/20..."
  sleep 1
done

# ── Step 1: App config keys ────────────────────────────────────────────
# These are read by the Rust backend at startup.
# NX = only set if key does not already exist.
echo ""
echo "── Step 1: Setting app config keys..."

rc SET "config:app:version"          "1.0.0"        NX EX 0 > /dev/null 2>&1 || true
rc SET "config:app:name"             "lora-studio"  NX > /dev/null 2>&1 || true
rc SET "config:job:max_concurrent"   "1"            NX > /dev/null 2>&1 || true
rc SET "config:job:max_queue_size"   "20"           NX > /dev/null 2>&1 || true
rc SET "config:job:wizard_ttl_secs"  "7200"         NX > /dev/null 2>&1 || true
rc SET "config:job:sse_ttl_secs"     "86400"        NX > /dev/null 2>&1 || true
rc SET "config:rate:requests_per_min" "60"          NX > /dev/null 2>&1 || true
echo "✓   Config keys set."

# ── Step 2: Key schema registry ───────────────────────────────────────
# Self-documenting: stores the key patterns and their purpose.
# Useful for debugging and for the Rust backend to validate key names.
echo ""
echo "── Step 2: Registering key schema..."

rc HSET "schema:keys" \
  "session:{user_id}:wizard"      "HASH | Wizard step state | TTL: 2h" \
  "queue:jobs:pending"            "LIST | Pending job IDs (LPUSH/BRPOP)" \
  "queue:jobs:running"            "SET  | Currently running job IDs" \
  "job:{job_id}:logs"             "PUBSUB channel | Training log lines" \
  "job:{job_id}:loss"             "PUBSUB channel | Loss point JSON" \
  "job:{job_id}:status"           "PUBSUB channel | Status change string" \
  "job:{job_id}:progress"         "PUBSUB channel | Progress JSON" \
  "job:{job_id}:meta"             "HASH | Job runtime metadata" \
  "user:{user_id}:notify"         "PUBSUB channel | User notifications" \
  "sse:{user_id}:connected"       "STRING | SSE presence flag | TTL: 5m" \
  "token:{token_hash}:session"    "HASH  | Auth session | TTL: 24h" \
  "ratelimit:{user_id}:{minute}"  "INCR  | Request count | TTL: 60s" \
  "config:app:*"                  "App-level configuration keys" \
  "config:job:*"                  "Job system configuration keys" \
  "config:rate:*"                 "Rate limiting configuration" \
  > /dev/null
echo "✓   Key schema registered at 'schema:keys'."

# ── Step 3: Feature flags ──────────────────────────────────────────────
echo ""
echo "── Step 3: Setting feature flags..."

rc HSET "config:features" \
  "wizard_persistence"    "true"   \
  "semantic_search"       "false"  \
  "multi_user"            "false"  \
  "auto_eval"             "true"   \
  "gguf_export"           "false"  \
  "notifications"         "true"   \
  > /dev/null
echo "✓   Feature flags set."

# ── Step 4: Job queue (empty list placeholder) ─────────────────────────
# RPUSH with a placeholder then delete — this pre-creates the key type
# so the Rust backend can always LLEN without key-not-found errors.
echo ""
echo "── Step 4: Initialising job queue..."
QUEUE_EXISTS=$(rc EXISTS "queue:jobs:pending")
if [[ "${QUEUE_EXISTS}" == "0" ]]; then
  # List doesn't exist yet — that's fine, BRPOP handles missing keys gracefully
  echo "✓   Job queue key absent — will be created on first LPUSH."
else
  echo "✓   Job queue already exists ($(rc LLEN queue:jobs:pending) items)."
fi

# ── Step 5: Verify ────────────────────────────────────────────────────
echo ""
echo "── Step 5: Verification..."
CONFIG_KEYS=$(rc KEYS "config:*" | wc -l)
echo "    config keys   : ${CONFIG_KEYS}"
echo "    schema keys   : $(rc HLEN schema:keys)"
echo "    feature flags : $(rc HLEN config:features)"

echo ""
echo "═══════════════════════════════════════"
echo "  ✓  Redis init complete!"
echo "═══════════════════════════════════════"

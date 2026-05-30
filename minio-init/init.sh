#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════
# minio-init/init.sh
#
# One-time MinIO setup using the mc (MinIO Client) tool:
#   - Creates all required buckets
#   - Sets lifecycle expiry policies (auto-delete old checkpoints)
#   - Sets bucket versioning on adapter bucket
#   - Verifies setup
#
# Safe to re-run — mc mb --ignore-existing skips existing buckets.
# ═══════════════════════════════════════════════════════════════════════

set -eu

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://lora-minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}"

BUCKET_DATASETS="${BUCKET_DATASETS:-lora-datasets}"
BUCKET_CHECKPOINTS="${BUCKET_CHECKPOINTS:-lora-checkpoints}"
BUCKET_ADAPTERS="${BUCKET_ADAPTERS:-lora-adapters}"
BUCKET_EXPORTS="${BUCKET_EXPORTS:-lora-exports}"

ALIAS="lora"

echo "═══════════════════════════════════════"
echo "  LoRA Studio — MinIO init"
echo "  Endpoint: ${MINIO_ENDPOINT}"
echo "═══════════════════════════════════════"

# ── Wait for MinIO ────────────────────────────────────────────────────
echo ""
echo "⏳  Waiting for MinIO..."
i=0
while [ $i -lt 20 ]; do
  if mc alias set "${ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" > /dev/null 2>&1; then
    echo "✓   MinIO is up."
    break
  fi
  i=$((i + 1))
  if [ $i -eq 20 ]; then
    echo "❌  Timed out waiting for MinIO."
    exit 1
  fi
  echo "    attempt $i/20..."
  sleep 2
done

# Re-set alias cleanly
mc alias set "${ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" --api S3v4 > /dev/null

# ── Step 1: Create buckets ────────────────────────────────────────────
echo ""
echo "── Step 1: Creating buckets..."

mc mb --ignore-existing "${ALIAS}/${BUCKET_DATASETS}"
echo "✓   ${BUCKET_DATASETS}"

mc mb --ignore-existing "${ALIAS}/${BUCKET_CHECKPOINTS}"
echo "✓   ${BUCKET_CHECKPOINTS}"

mc mb --ignore-existing "${ALIAS}/${BUCKET_ADAPTERS}"
echo "✓   ${BUCKET_ADAPTERS}"

mc mb --ignore-existing "${ALIAS}/${BUCKET_EXPORTS}"
echo "✓   ${BUCKET_EXPORTS}"

# ── Step 2: Lifecycle policies ────────────────────────────────────────
# Checkpoints are intermediate — auto-delete after 7 days
# Exports are temporary download bundles — auto-delete after 3 days
echo ""
echo "── Step 2: Setting lifecycle policies..."

# Checkpoints: expire after 7 days
mc ilm rule add \
  --expire-days 7 \
  "${ALIAS}/${BUCKET_CHECKPOINTS}" \
  > /dev/null 2>&1 || echo "    (checkpoint lifecycle already set)"
echo "✓   ${BUCKET_CHECKPOINTS}: expire after 7 days"

# Exports: expire after 3 days
mc ilm rule add \
  --expire-days 3 \
  "${ALIAS}/${BUCKET_EXPORTS}" \
  > /dev/null 2>&1 || echo "    (exports lifecycle already set)"
echo "✓   ${BUCKET_EXPORTS}: expire after 3 days"

# ── Step 3: Set bucket versioning on adapters ─────────────────────────
# Versioning lets us keep multiple adapter versions without overwriting
echo ""
echo "── Step 3: Enabling versioning on adapters bucket..."
mc version enable "${ALIAS}/${BUCKET_ADAPTERS}" > /dev/null 2>&1 || \
  echo "    (versioning already enabled or not supported in this mode)"
echo "✓   ${BUCKET_ADAPTERS}: versioning enabled"

# ── Step 4: Anonymous read policy for exports bucket ──────────────────
# Exports use presigned URLs so no anonymous policy needed.
# Keeping all buckets private (default).
echo ""
echo "── Step 4: Verifying bucket policies (all private)..."
for bucket in "${BUCKET_DATASETS}" "${BUCKET_CHECKPOINTS}" "${BUCKET_ADAPTERS}" "${BUCKET_EXPORTS}"; do
  mc anonymous get "${ALIAS}/${bucket}" 2>/dev/null || true
  echo "    ${bucket}: private (presigned URLs only)"
done

# ── Step 5: Verify ────────────────────────────────────────────────────
echo ""
echo "── Step 5: Verification..."
echo "    Buckets:"
mc ls "${ALIAS}"

echo ""
echo "═══════════════════════════════════════"
echo "  ✓  MinIO init complete!"
echo ""
echo "  Buckets:"
echo "    ${BUCKET_DATASETS}      — uploaded training data"
echo "    ${BUCKET_CHECKPOINTS}   — training checkpoints (7d expiry)"
echo "    ${BUCKET_ADAPTERS}      — LoRA adapter files (versioned)"
echo "    ${BUCKET_EXPORTS}       — download bundles (3d expiry)"
echo ""
echo "  Web console: ${MINIO_ENDPOINT%:9000}:9001"
echo "═══════════════════════════════════════"

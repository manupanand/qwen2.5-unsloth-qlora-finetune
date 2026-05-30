#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# postgres-init/init.sh
# Creates lora_studio role, database, and schema on an existing postgres.
# Safe to re-run — all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

required_vars=(PG_HOST PG_PORT PG_SUPERUSER PG_SUPERUSER_PASS LORA_DB_NAME LORA_DB_USER LORA_DB_PASS)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌  Required env var '$var' is not set. Aborting."
    exit 1
  fi
done

export PGPASSWORD="${PG_SUPERUSER_PASS}"

# The database to connect to for the wait check and initial commands.
# Must be a DB that already exists — use the one created at init time.
CONNECT_DB="${POSTGRES_DB:-${LORA_DB_NAME}}"

echo "═══════════════════════════════════════"
echo "  LoRA Studio — Postgres init"
echo "  Host:    ${PG_HOST}:${PG_PORT}"
echo "  Connect: ${CONNECT_DB}"
echo "  New DB:  ${LORA_DB_NAME}"
echo "  User:    ${LORA_DB_USER}"
echo "═══════════════════════════════════════"

# ── Helper ─────────────────────────────────────────────────────────────
run_psql() {
  local db="$1"; shift
  psql \
    --host="${PG_HOST}" \
    --port="${PG_PORT}" \
    --username="${PG_SUPERUSER}" \
    --dbname="${db}" \
    --no-password \
    "$@"
}

# ── Wait for postgres ──────────────────────────────────────────────────
echo ""
echo "⏳  Waiting for postgres at ${PG_HOST}:${PG_PORT}..."
for i in $(seq 1 30); do
  if run_psql "${CONNECT_DB}" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✓   Postgres is up."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "❌  Timed out. Check PG_HOST, PG_PORT, PG_SUPERUSER, PG_SUPERUSER_PASS."
    exit 1
  fi
  echo "    attempt $i/30 — retrying in 2s..."
  sleep 2
done

# ── Step 1: Create role ────────────────────────────────────────────────
echo ""
echo "── Step 1: Creating role '${LORA_DB_USER}'..."
run_psql "${CONNECT_DB}" << SQL
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = '${LORA_DB_USER}'
  ) THEN
    CREATE ROLE "${LORA_DB_USER}"
      WITH LOGIN
      PASSWORD '${LORA_DB_PASS}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE
      CONNECTION LIMIT 50;
    RAISE NOTICE 'Role ${LORA_DB_USER} created.';
  ELSE
    ALTER ROLE "${LORA_DB_USER}" WITH PASSWORD '${LORA_DB_PASS}';
    RAISE NOTICE 'Role ${LORA_DB_USER} already exists — password refreshed.';
  END IF;
END
\$\$;
SQL
echo "✓   Role ready."

# ── Step 2: Create database ────────────────────────────────────────────
echo ""
echo "── Step 2: Creating database '${LORA_DB_NAME}'..."
DB_EXISTS=$(run_psql "${CONNECT_DB}" -tAc "SELECT 1 FROM pg_database WHERE datname='${LORA_DB_NAME}'")
if [[ "${DB_EXISTS}" != "1" ]]; then
  run_psql "${CONNECT_DB}" -c "CREATE DATABASE \"${LORA_DB_NAME}\" OWNER \"${LORA_DB_USER}\" ENCODING 'UTF8' TEMPLATE template0;"
  echo "✓   Database '${LORA_DB_NAME}' created."
else
  echo "✓   Database '${LORA_DB_NAME}' already exists — skipping."
fi

# ── Step 3: Extensions ────────────────────────────────────────────────
echo ""
echo "── Step 3: Enabling extensions..."
run_psql "${LORA_DB_NAME}" << SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SQL
echo "✓   Extensions enabled."

# ── Step 4: Grants ────────────────────────────────────────────────────
echo ""
echo "── Step 4: Granting privileges..."
run_psql "${LORA_DB_NAME}" << SQL
GRANT ALL PRIVILEGES ON DATABASE "${LORA_DB_NAME}" TO "${LORA_DB_USER}";
GRANT ALL ON SCHEMA public TO "${LORA_DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${LORA_DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${LORA_DB_USER}";
SQL
echo "✓   Privileges granted."

# ── Step 5: Schema ────────────────────────────────────────────────────
echo ""
echo "── Step 5: Applying schema.sql..."
export PGPASSWORD="${LORA_DB_PASS}"
psql \
  --host="${PG_HOST}" \
  --port="${PG_PORT}" \
  --username="${LORA_DB_USER}" \
  --dbname="${LORA_DB_NAME}" \
  --no-password \
  --file=/init/schema.sql \
  --echo-errors \
  --set ON_ERROR_STOP=1
echo "✓   Schema applied."

echo ""
echo "═══════════════════════════════════════"
echo "  ✓  Postgres init complete!"
echo "  Connect: postgresql://${LORA_DB_USER}:***@${PG_HOST}:${PG_PORT}/${LORA_DB_NAME}"
echo "═══════════════════════════════════════"

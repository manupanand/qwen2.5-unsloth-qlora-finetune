# 1. Infra (once ever)
docker compose -f infra-docker-compose.yml --profile infra up -d
docker compose -f infra-docker-compose.yml --profile init up --abort-on-container-exit

# 2. App
docker compose --profile dev up          # dev with hot reload
docker compose --profile prod up -d      # prod, Rust serves the UI


# Destroys ALL data in edge_pgdata, redis_data, qdrant_data, minio_data
docker compose -f infra-docker-compose.yml --profile infra down -v

# Bring everything back fresh
docker compose -f infra-docker-compose.yml --profile infra up -d

# Re-run all init containers
docker compose -f infra-docker-compose.yml --profile init up --abort-on-container-exit

#---
# # Tear down what's running
docker compose -f infra-docker-compose.yml --env-file infra.env --profile infra down -v

# Bring back up
docker compose -f infra-docker-compose.yml --env-file infra.env --profile infra up -d

# Watch all 4 come healthy
docker ps

# Check all 4 are healthy first
docker ps

# Then run init containers
docker compose -f infra-docker-compose.yml --env-file infra.env --profile init up --abort-on-container-exit
docker compose -f infra-docker-compose.yml --env-file infra.env --profile infra --profile init up --abort-on-container-exit
---
# Step 1 — start persistent services (already running? skip this)
docker compose -f infra-docker-compose.yml --env-file infra.env --profile infra up -d

# Wait ~15 seconds, check all are healthy
docker ps

# Step 2 — run init containers (separate command, profile init only)
docker compose -f infra-docker-compose.yml --env-file infra.env --profile init up --abort-on-container-exit

# Dev — starts both Vite and Rust API
docker compose --profile dev up
docker compose --profile dev up --build #build
docker compose --profile dev up --build --force-recreate
# UI:  http://localhost:3000/agent/view/finetune-llm/auth
# API: http://localhost:8000/health  (direct debug access)

# Prod — single container
docker compose --profile prod up
# UI + API: http://localhost:8000/agent/view/finetune-llm/auth

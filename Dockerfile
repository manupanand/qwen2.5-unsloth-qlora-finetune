# # ─────────────────────────────────────────────────────────────────────
# # Stage 1 — Build React UI (from ui/ folder)
# # ─────────────────────────────────────────────────────────────────────
# FROM node:20-alpine AS ui-builder
# WORKDIR /ui
# COPY ui/package.json ./
# RUN npm install
# COPY ui/ ./
# RUN npm run build
# # Output: /ui/dist/

# # ─────────────────────────────────────────────────────────────────────
# # Stage 2 — Build Rust Axum server (from server/ folder)
# # ─────────────────────────────────────────────────────────────────────
# FROM rust:1.78-slim AS rust-builder
# WORKDIR /server
# # Cache dependencies first (faster rebuilds)
# COPY server/Cargo.toml ./Cargo.toml
# RUN mkdir src && echo 'fn main(){}' > src/main.rs
# RUN cargo build --release
# RUN rm src/main.rs
# # Build real source
# COPY server/src ./src
# RUN touch src/main.rs && cargo build --release
# # Output: /server/target/release/server

# # ─────────────────────────────────────────────────────────────────────
# # Stage 3 — Final image: binary + dist, nothing else (~80MB)
# # ─────────────────────────────────────────────────────────────────────
# FROM debian:bookworm-slim AS final
# RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
# WORKDIR /app
# COPY --from=rust-builder /server/target/release/server ./server
# COPY --from=ui-builder   /ui/dist                      ./dist
# ENV PORT=8000
# ENV RUST_LOG=info
# EXPOSE 8000
# CMD ["./server"]

#----------------new
# ─────────────────────────────────────────────────────────────────────
# Stage 1 — Build React UI (used by prod only)
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /ui
COPY ui/package.json ./
RUN npm install
COPY ui/ ./
RUN npm run build
# → /ui/dist/

# ─────────────────────────────────────────────────────────────────────
# Stage 2 — Build Rust binary
# ─────────────────────────────────────────────────────────────────────
FROM rust:1.78-slim AS rust-builder
WORKDIR /server
# Cache deps layer
COPY server/Cargo.toml ./Cargo.toml
RUN mkdir src && echo 'fn main(){}' > src/main.rs
RUN cargo build --release
RUN rm src/main.rs
# Real build
COPY server/src ./src
RUN touch src/main.rs && cargo build --release
# → /server/target/release/server

# ─────────────────────────────────────────────────────────────────────
# Stage 3a — Dev API image
# Rust binary only — no UI dist bundled.
# Vite dev server (separate container) proxies /api/* to this container.
# ─────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS dev-api
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=rust-builder /server/target/release/server ./server
# No dist/ here — DIST_DIR will point to a non-existent path.
# The /health and /api/* routes still work fine without it.
ENV PORT=8000
ENV RUST_LOG=debug
EXPOSE 8000
CMD ["./server"]

# ─────────────────────────────────────────────────────────────────────
# Stage 3b — Production image
# Single binary + built UI dist. Nothing else.
# ─────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS final
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=rust-builder /server/target/release/server ./server
COPY --from=ui-builder   /ui/dist                      ./dist
ENV PORT=8000
ENV RUST_LOG=info
EXPOSE 8000
CMD ["./server"]

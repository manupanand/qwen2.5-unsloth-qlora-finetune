# ─────────────────────────────────────────────────────────────────────
# Stage 1 — Build React UI (from ui/ folder)
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /ui
COPY ui/package.json ./
RUN npm install
COPY ui/ ./
RUN npm run build
# Output: /ui/dist/

# ─────────────────────────────────────────────────────────────────────
# Stage 2 — Build Rust Axum server (from server/ folder)
# ─────────────────────────────────────────────────────────────────────
FROM rust:1.78-slim AS rust-builder
WORKDIR /server
# Cache dependencies first (faster rebuilds)
COPY server/Cargo.toml ./Cargo.toml
RUN mkdir src && echo 'fn main(){}' > src/main.rs
RUN cargo build --release
RUN rm src/main.rs
# Build real source
COPY server/src ./src
RUN touch src/main.rs && cargo build --release
# Output: /server/target/release/server

# ─────────────────────────────────────────────────────────────────────
# Stage 3 — Final image: binary + dist, nothing else (~80MB)
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

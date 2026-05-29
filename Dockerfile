# ─────────────────────────────────────────────────────────────────────
# Stage 1: Build React UI
# ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder

WORKDIR /ui

COPY package.json ./
RUN npm install

COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build
# → produces /ui/dist/


# ─────────────────────────────────────────────────────────────────────
# Stage 2: Build Rust Axum server
# ─────────────────────────────────────────────────────────────────────
FROM rust:1.78-slim AS rust-builder

WORKDIR /server

# Cache dependency layer separately (faster rebuilds)
COPY server/Cargo.toml ./Cargo.toml
RUN mkdir src && echo 'fn main(){}' > src/main.rs
RUN cargo build --release
RUN rm src/main.rs

# Now build the real source
COPY server/src ./src
# Touch main.rs so cargo picks up the change
RUN touch src/main.rs
RUN cargo build --release
# → produces /server/target/release/server


# ─────────────────────────────────────────────────────────────────────
# Stage 3: Final image — binary + dist, nothing else
# ─────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS final

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled Rust binary
COPY --from=rust-builder /server/target/release/server ./server

# Copy the React dist — Axum serves it from ./dist relative to CWD
COPY --from=ui-builder /ui/dist ./dist

ENV PORT=4096
ENV RUST_LOG=info

EXPOSE 4096

CMD ["./server"]

import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
const BASE = "/agent/view/finetune-llm";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  base: BASE,
  server: {
    host: "0.0.0.0",
    port: 3000,
    // ── Dev proxy: forward /api and /health to the Rust API container ──
    // This means the UI dev server talks to the Rust API on :8000
    // without CORS issues — browser sees everything on :3000
    proxy: {
      "/api": {
        target: "http://finetune-api-dev:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://finetune-api-dev:8000",
        changeOrigin: true,
      },
    },
  },
});

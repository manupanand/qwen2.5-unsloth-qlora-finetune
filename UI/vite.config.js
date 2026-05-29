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
  },
});

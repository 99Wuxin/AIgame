import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** 与 Worker 99 共存：正式站挂在 /aigame，勿占根域 */
const BASE = "/aigame/";

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/aigame": { target: "http://127.0.0.1:8787", changeOrigin: true }
    }
  }
});

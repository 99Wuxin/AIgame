import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./",
    server: {
      proxy:
        env.VITE_USE_OPENROUTER_PROXY === "true"
          ? {
              "/api/chat-proxy": {
                target: "https://openrouter.ai/api/v1/chat/completions",
                changeOrigin: true,
                rewrite: () => "/chat/completions",
                configure: (proxy) => {
                  proxy.on("proxyReq", (proxyReq) => {
                    const k = env.OPENROUTER_API_KEY;
                    if (k) proxyReq.setHeader("Authorization", `Bearer ${k}`);
                    proxyReq.setHeader("HTTP-Referer", "http://localhost:5173");
                    proxyReq.setHeader("X-Title", "田园心语");
                  });
                },
              },
            }
          : undefined,
    },
  };
});

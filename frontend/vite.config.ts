import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Override when the API is not on :8000 - e.g. API_PROXY_TARGET=http://localhost:8077
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev server proxies the API so the browser sees a single origin and
      // CORS stays out of the way. In the Docker image, nginx does the same.
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});

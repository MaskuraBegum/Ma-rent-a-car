
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backend = "http://localhost:5000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: [
      "processing-experienced-attached-centers.trycloudflare.com"
    ],
    proxy: {
      "/api": backend,
      "/uploads": backend
    }
  },
});

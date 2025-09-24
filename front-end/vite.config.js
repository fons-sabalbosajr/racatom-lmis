// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // 👈 serve app under /
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [process.env.VITE_TUNNEL_HOST || ".ngrok-free.app"],
  },
});

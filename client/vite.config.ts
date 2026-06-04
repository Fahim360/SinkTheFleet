import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Discord Activities require the app to be served from /.proxy/
    // The Vite dev server proxies the game server WebSocket
    proxy: {
      "/.proxy/colyseus": {
        target: "ws://localhost:3001",
        ws: true,
        rewrite: (path) => path.replace(/^\/.proxy\/colyseus/, ""),
      },
      "/.proxy/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/.proxy\/api/, "/api"),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  define: {
    // Expose env vars to client
    __SERVER_URL__: JSON.stringify(process.env.VITE_SERVER_URL || ""),
  },
});

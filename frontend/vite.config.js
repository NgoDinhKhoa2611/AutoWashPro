import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Silence harmless "/*#__PURE__*/" annotation warnings emitted by Rolldown
      // for third-party deps (e.g. @microsoft/signalr). These are dead-code-
      // elimination hints we can't fix at the source; pass through everything else.
      onwarn(warning, defaultHandler) {
        if (warning.code === "INVALID_ANNOTATION") return;
        defaultHandler(warning);
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
      },
      "/Account": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
      },
      "/Customer": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
      },
      "/Admin": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
      },
      "/Debug": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
      },
      "/hubs": {
        target: "http://localhost:5023",
        changeOrigin: true,
        secure: false,
        ws: true, // SignalR WebSocket transport
      },
    },
  },
});

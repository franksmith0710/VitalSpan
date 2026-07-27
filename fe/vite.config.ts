/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: path.resolve(__dirname, "node_modules/.vite"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["three"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "vendor-three";
          if (id.includes("node_modules/d3")) return "vendor-d3";
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (id.includes("/pages/admin/dashboard/DashboardEditPage")) return "page-dashboard-edit";
          if (id.includes("/components/charts/engine/")) return "charts-engine";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts", "./src/vitest.antv.mock.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

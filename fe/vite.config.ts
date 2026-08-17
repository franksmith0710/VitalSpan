/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiProxyTarget = env.VITE_DEV_API_PROXY || "http://localhost:8000";
  const feBaseSegment = (env.VITE_FE_BASE_PATH || env.FE_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
  const base = feBaseSegment ? `/${feBaseSegment}/` : "/";
  const proxyBaseSegments = feBaseSegment ? [feBaseSegment] : [];

  const proxy: Record<string, { target: string; changeOrigin: boolean; rewrite?: (path: string) => string }> = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  };
  for (const segment of proxyBaseSegments) {
    proxy[`/${segment}/api`] = {
      target: apiProxyTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(new RegExp(`^/${segment}`), ""),
    };
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    cacheDir: path.resolve(__dirname, "node_modules/.vite"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["three", "react", "react-dom", "maplibre-gl", "zustand"],
    },
    optimizeDeps: {
      include: ["maplibre-gl", "zustand", "zundo"],
      exclude: ["cesium"],
    },
    server: {
      // Align with backend FE_BASE_URL default (127.0.0.1) for Playwright PDF export.
      host: "127.0.0.1",
      fs: {
        allow: [path.resolve(__dirname, "..")],
      },
      proxy,
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
            if (id.includes("node_modules/maplibre-gl")) return "vendor-maplibre";
            if (id.includes("vendor/geolibre") || id.includes("@geolibre/")) return "vendor-geolibre";
            if (id.includes("/components/charts/engine/geolibre/")) return "charts-geolibre";
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/vitest.setup.ts", "./src/vitest.antv.mock.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      server: {
        deps: {
          inline: [/@geolibre\//, /@maplibre\//, /vendor\/geolibre/],
        },
      },
    },
  };
});

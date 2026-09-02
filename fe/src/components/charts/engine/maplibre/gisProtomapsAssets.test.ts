import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROTOMAPS_GLYPHS_URL,
  mirrorProtomapsBasemapAssetsUrl,
  PROTOMAPS_ASSETS_GITHUB,
  PROTOMAPS_ASSETS_MIRROR,
  resolveDevBasemapAssetsUrl,
} from "@/components/charts/engine/maplibre/gisProtomapsAssets";

describe("gisProtomapsAssets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mirrors github assets host to jsDelivr", () => {
    const raw = `${PROTOMAPS_ASSETS_GITHUB}/fonts/{fontstack}/{range}.pbf`;
    expect(mirrorProtomapsBasemapAssetsUrl(raw)).toBe(
      `${PROTOMAPS_ASSETS_MIRROR}/fonts/{fontstack}/{range}.pbf`,
    );
    expect(DEFAULT_PROTOMAPS_GLYPHS_URL).toContain("jsdelivr.net");
  });

  it("proxies mirrored assets through vite in dev", () => {
    vi.stubEnv("DEV", true);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "http://127.0.0.1:5173" },
    });
    const mirrored = `${PROTOMAPS_ASSETS_MIRROR}/sprites/v4/light`;
    expect(resolveDevBasemapAssetsUrl(mirrored)).toBe(
      "http://127.0.0.1:5173/dev-basemaps-assets/sprites/v4/light",
    );
  });

  it("does not double-proxy dev-basemaps-assets urls", () => {
    vi.stubEnv("DEV", true);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "http://127.0.0.1:5173" },
    });
    const proxied = "http://127.0.0.1:5173/dev-basemaps-assets/fonts/{fontstack}/{range}.pbf";
    expect(resolveDevBasemapAssetsUrl(proxied)).toBe(proxied);
  });
});

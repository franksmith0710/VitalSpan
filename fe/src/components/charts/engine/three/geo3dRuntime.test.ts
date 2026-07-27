import { afterEach, describe, expect, it } from "vitest";
import {
  GEO3D_MAX_WEBGL_INSTANCES,
  defaultGeo3dRenderTier,
  resetWebGLSlotsForTests,
  resolveTerrainTextureEnabled,
  tryAcquireWebGLSlot,
} from "@/components/charts/engine/three/geo3dRuntime";

afterEach(() => {
  resetWebGLSlotsForTests();
});

describe("tryAcquireWebGLSlot", () => {
  it("rejects new keys when at capacity", () => {
    for (let i = 0; i < GEO3D_MAX_WEBGL_INSTANCES; i += 1) {
      expect(tryAcquireWebGLSlot(`slot-${i}`)).toBe(true);
    }
    expect(tryAcquireWebGLSlot("slot-overflow")).toBe(false);
  });

  it("re-acquiring the same key does not consume another slot", () => {
    expect(tryAcquireWebGLSlot("same")).toBe(true);
    expect(tryAcquireWebGLSlot("same")).toBe(true);
    for (let i = 0; i < GEO3D_MAX_WEBGL_INSTANCES - 1; i += 1) {
      expect(tryAcquireWebGLSlot(`other-${i}`)).toBe(true);
    }
    expect(tryAcquireWebGLSlot("another")).toBe(false);
  });
});

describe("resolveTerrainTextureEnabled", () => {
  it("is false for thumbnail tier", () => {
    expect(resolveTerrainTextureEnabled("embed", { stylePreset: "satellite", terrainTexture: true })).toBe(true);
    expect(resolveTerrainTextureEnabled("thumbnail", { stylePreset: "satellite", terrainTexture: true })).toBe(false);
  });

  it("follows geo3d style on satellite preset", () => {
    expect(resolveTerrainTextureEnabled("full", { stylePreset: "satellite", terrainTexture: true })).toBe(true);
    expect(resolveTerrainTextureEnabled("full", { stylePreset: "satellite", terrainTexture: false })).toBe(false);
    expect(resolveTerrainTextureEnabled("embed", { stylePreset: "satellite", terrainTexture: false })).toBe(false);
  });

  it("is false for non-satellite presets even when terrainTexture is true", () => {
    expect(resolveTerrainTextureEnabled("full", { stylePreset: "tech", terrainTexture: true })).toBe(false);
    expect(resolveTerrainTextureEnabled("embed", { stylePreset: "classic", terrainTexture: true })).toBe(false);
    expect(resolveTerrainTextureEnabled("full", { stylePreset: "minimal", terrainTexture: true })).toBe(false);
  });
});

describe("defaultGeo3dRenderTier", () => {
  it("returns embed for embedded charts and full otherwise", () => {
    expect(defaultGeo3dRenderTier(true)).toBe("embed");
    expect(defaultGeo3dRenderTier(false)).toBe("full");
  });
});

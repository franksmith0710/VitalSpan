import { describe, expect, it, vi } from "vitest";
import {
  advanceGlobeLongitude,
  GLOBE_IDLE_ROTATION_DEG_PER_SEC,
  markGisMapPaintReady,
  normalizeGlobeLongitude,
  REAL_EARTH_ROTATION_DEG_PER_SEC,
  whenGisMapStyleReady,
} from "@/components/charts/engine/maplibre/gisMapRuntime";

describe("gisGlobeAutoRotate", () => {
  it("uses realistic earth rotation speed", () => {
    expect(REAL_EARTH_ROTATION_DEG_PER_SEC).toBeCloseTo(360 / 86400, 8);
    expect(GLOBE_IDLE_ROTATION_DEG_PER_SEC).toBeCloseTo(360 / (8 * 60), 8);
  });

  it("wraps longitude", () => {
    expect(normalizeGlobeLongitude(190)).toBe(-170);
    expect(normalizeGlobeLongitude(-190)).toBe(170);
  });

  it("advances longitude west for eastward spin", () => {
    expect(advanceGlobeLongitude(100, 1, 10)).toBe(90);
    expect(advanceGlobeLongitude(-179, 1, 2)).toBe(179);
  });
});

describe("whenGisMapStyleReady", () => {
  it("runs immediately when style is loaded", () => {
    const run = vi.fn();
    whenGisMapStyleReady(
      {
        isStyleLoaded: () => true,
        loaded: () => true,
        once: vi.fn(),
        off: vi.fn(),
      } as never,
      run,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("keeps listening when load fires before style is ready", () => {
    const run = vi.fn();
    const once = vi.fn();
    const off = vi.fn();
    const handlers = new Map<string, () => void>();
    once.mockImplementation((event: string, cb: () => void) => {
      handlers.set(event, cb);
    });
    off.mockImplementation((event: string) => {
      handlers.delete(event);
    });
    let styleLoaded = false;
    const map = {
      isStyleLoaded: () => styleLoaded,
      loaded: () => false,
      once,
      off,
    };

    whenGisMapStyleReady(map as never, run);
    handlers.get("load")?.();
    expect(run).not.toHaveBeenCalled();
    expect(handlers.has("style.load")).toBe(true);

    styleLoaded = true;
    handlers.get("style.load")?.();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("markGisMapPaintReady", () => {
  it("finishes on first idle for globe without waiting for areTilesLoaded", () => {
    const onReady = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      areTilesLoaded: () => false,
      triggerRepaint: vi.fn(),
      once: vi.fn((event: string, cb: () => void) => {
        if (event === "idle" || event === "render") cb();
      }),
    };
    markGisMapPaintReady(map as never, onReady, () => false, "globe");
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

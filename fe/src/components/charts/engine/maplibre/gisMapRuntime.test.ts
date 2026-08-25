import { describe, expect, it, vi } from "vitest";
import {
  advanceGlobeLongitude,
  GLOBE_IDLE_ROTATION_DEG_PER_SEC,
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

  it("waits for style.load when map already loaded but style is reloading", () => {
    const run = vi.fn();
    const once = vi.fn();
    const queued: Array<() => void> = [];
    let styleLoaded = false;
    once.mockImplementation((_event: string, cb: () => void) => {
      queued.push(cb);
    });
    const map = {
      isStyleLoaded: () => styleLoaded,
      loaded: () => true,
      once,
      off: vi.fn(),
    };

    whenGisMapStyleReady(map as never, run);
    expect(once).toHaveBeenCalledTimes(1);
    expect(once).toHaveBeenCalledWith("style.load", expect.any(Function));
    styleLoaded = true;
    for (const cb of queued) cb();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  advanceGlobeLongitude,
  GLOBE_IDLE_ROTATION_DEG_PER_SEC,
  normalizeGlobeLongitude,
  REAL_EARTH_ROTATION_DEG_PER_SEC,
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

import { describe, expect, it } from "vitest";
import {
  isInsideGlobeDisc,
  resolveGlobeLimbBoundsFromMap,
  resolveGlobeStarViewRotation,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";

describe("gisGlobeLayout stars", () => {
  const globe = {
    x: 200,
    y: 150,
    radius: 120,
    bearing: 0,
    pitch: 0,
    centerLng: 100,
    centerLat: 28,
  };

  it("combines bearing and center longitude for star rotation", () => {
    expect(resolveGlobeStarViewRotation({ ...globe, bearing: 15, centerLng: 100 })).toBe(115);
  });

  it("detects points inside globe disc", () => {
    expect(isInsideGlobeDisc(globe.x, globe.y, globe)).toBe(true);
    expect(isInsideGlobeDisc(globe.x + globe.radius + 10, globe.y, globe)).toBe(false);
  });
});

describe("resolveGlobeLimbBoundsFromMap", () => {
  it("raycasts the rendered globe disc from transform surface probe", () => {
    const map = {
      getCenter: () => ({ lng: 100, lat: 28 }),
      project: () => ({ x: 200, y: 150 }),
      transform: {
        centerPoint: { x: 200, y: 150 },
        width: 400,
        height: 300,
        isPointOnMapSurface: (point: { x: number; y: number }) =>
          Math.hypot(point.x - 200, point.y - 150) <= 80,
      },
    };

    const limb = resolveGlobeLimbBoundsFromMap(map as never);
    expect(limb).not.toBeNull();
    expect(limb?.x).toBeCloseTo(200, 0);
    expect(limb?.y).toBeCloseTo(150, 0);
    expect(limb?.radius).toBeGreaterThan(75);
    expect(limb?.radius).toBeLessThan(85);
  });
});

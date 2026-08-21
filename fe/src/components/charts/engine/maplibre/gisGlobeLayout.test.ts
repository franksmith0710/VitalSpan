import { describe, expect, it } from "vitest";
import {
  isInsideGlobeDisc,
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

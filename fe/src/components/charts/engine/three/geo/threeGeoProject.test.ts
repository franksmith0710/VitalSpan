import { describe, expect, it } from "vitest";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import {
  buildMapFitCollection,
  buildThreeGeoProject,
} from "@/components/charts/engine/three/geo/threeGeoProject";

describe("buildThreeGeoProject", () => {
  it("anchors national map on projected bbox center", () => {
    const fitCollection = buildMapFitCollection(chinaProvincesGeo);
    const ctx = buildThreeGeoProject(800, 600, fitCollection.features, fitCollection);
    const midX = (ctx.projBounds.minX + ctx.projBounds.maxX) / 2;
    const midY = (ctx.projBounds.minY + ctx.projBounds.maxY) / 2;
    expect(Math.abs(midX)).toBeLessThan(1);
    expect(Math.abs(midY)).toBeLessThan(1);
  });

  it("computes proj bounds from joined features", () => {
    const geometry = {
      type: "Polygon" as const,
      coordinates: [
        [
          [105, 30],
          [106, 30],
          [106, 31],
          [105, 31],
          [105, 30],
        ],
      ],
    };
    const fitCollection = {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry }],
    };
    const ctx = buildThreeGeoProject(800, 600, fitCollection.features, fitCollection);
    expect(ctx.projBounds.maxX - ctx.projBounds.minX).toBeGreaterThan(0);
    expect(ctx.projBounds.maxY - ctx.projBounds.minY).toBeGreaterThan(0);
  });
});

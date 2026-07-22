import { describe, expect, it } from "vitest";
import { buildThreeGeoProject } from "@/components/charts/engine/three/geo/threeGeoProject";

describe("buildThreeGeoProject", () => {
  it("matches D3 margin-aware mercator projection", () => {
    const ctx = buildThreeGeoProject(800, 600, [], {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "北京" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [116.2, 39.7],
                [116.6, 39.7],
                [116.6, 40.1],
                [116.2, 40.1],
                [116.2, 39.7],
              ],
            ],
          },
        },
      ],
    });
    const p = ctx.project([116.4, 39.9]);
    expect(p).not.toBeNull();
    expect(ctx.centerX).toBe(0);
    expect(ctx.centerY).toBe(0);
    expect(ctx.projBounds.maxX).toBeGreaterThan(ctx.projBounds.minX);
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
    const ctx = buildThreeGeoProject(
      800,
      600,
      [{ geometry }],
      { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry }] },
    );
    expect(ctx.projBounds.maxX - ctx.projBounds.minX).toBeGreaterThan(0);
    expect(ctx.projBounds.maxY - ctx.projBounds.minY).toBeGreaterThan(0);
  });
});

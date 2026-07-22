import { describe, expect, it } from "vitest";
import { chinaGeoLayoutCenterInViewport } from "@/components/charts/engine/geo/geoProjection";
import { buildThreeGeoProject, THREE_GEO_MAP_MARGIN } from "@/components/charts/engine/three/geo/threeGeoProject";

describe("buildThreeGeoProject", () => {
  it("uses D3 layout center (not feature bbox) for axis alignment", () => {
    const width = 640;
    const height = 480;
    const layoutCenter = chinaGeoLayoutCenterInViewport(width, height, THREE_GEO_MAP_MARGIN);
    const ctx = buildThreeGeoProject(width, height, [], {
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
    expect(ctx.centerX).toBeCloseTo(layoutCenter.centerX, 8);
    expect(ctx.centerY).toBeCloseTo(layoutCenter.centerY, 8);
  });

  it("centers projected bounds around origin", () => {
    const ctx = buildThreeGeoProject(
      800,
      600,
      [
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [100, 20],
                [110, 20],
                [110, 30],
                [100, 30],
                [100, 20],
              ],
            ],
          },
        },
      ],
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [100, 20],
                  [110, 20],
                  [110, 30],
                  [100, 30],
                  [100, 20],
                ],
              ],
            },
          },
        ],
      },
    );
    const midX = (ctx.projBounds.minX + ctx.projBounds.maxX) / 2;
    const midY = (ctx.projBounds.minY + ctx.projBounds.maxY) / 2;
    expect(Math.abs(midX)).toBeLessThan(1);
    expect(Math.abs(midY)).toBeLessThan(1);
  });
});

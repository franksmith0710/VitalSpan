import { describe, expect, it } from "vitest";
import {
  buildRegionPointSamples,
  resolveRegionCentroidLngLat,
} from "@/components/charts/engine/three/geo3dRegionCentroid";

describe("geo3dRegionCentroid", () => {
  it("computes centroid from point geometry", () => {
    const geometry: GeoJSON.Point = {
      type: "Point",
      coordinates: [100.5, 30.5],
    };
    const centroid = resolveRegionCentroidLngLat(geometry);
    expect(centroid?.[0]).toBeCloseTo(100.5, 5);
    expect(centroid?.[1]).toBeCloseTo(30.5, 5);
  });

  it("builds projected samples with normalized valueT", () => {
    const samples = buildRegionPointSamples(
      [
        {
          name: "A",
          value: 10,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [100, 30],
                [101, 30],
                [101, 31],
                [100, 31],
                [100, 30],
              ],
            ],
          },
        },
        {
          name: "B",
          value: 30,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [102, 30],
                [103, 30],
                [103, 31],
                [102, 31],
                [102, 30],
              ],
            ],
          },
        },
      ],
      (coord) => [coord[0] * 10, coord[1] * 10],
      10,
      30,
    );
    expect(samples).toHaveLength(2);
    expect(samples[0]?.valueT).toBe(0);
    expect(samples[1]?.valueT).toBe(1);
  });

  it("uses projected polygon centroid instead of lng/lat centroid", () => {
    const geometry: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [100, 30],
          [102, 30],
          [102, 32],
          [100, 32],
          [100, 30],
        ],
      ],
    };
    const project = (coord: [number, number]) => [coord[0] * 10, coord[1] * 10] as [number, number];
    const fromProjected = buildRegionPointSamples(
      [{ name: "box", value: 1, geometry }],
      project,
      0,
      1,
    )[0];
    const fromLngLat = project([101, 31]);
    expect(fromProjected?.x).toBeCloseTo(1010, 3);
    expect(fromProjected?.y).toBeCloseTo(310, 3);
    expect(fromLngLat?.[0]).toBeCloseTo(1010, 3);
    expect(fromLngLat?.[1]).toBeCloseTo(310, 3);
  });
});

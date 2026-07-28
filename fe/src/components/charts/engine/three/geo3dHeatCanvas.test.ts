import { describe, expect, it } from "vitest";
import { mapSamplesToCanvasPoints } from "@/components/charts/engine/three/geo3dHeatCanvas";

describe("geo3dHeatCanvas", () => {
  it("maps projection samples into canvas coordinates", () => {
    const points = mapSamplesToCanvasPoints(
      [
        { x: 0, y: 0, value: 10 },
        { x: 100, y: 50, value: 20 },
      ],
      { minX: 0, maxX: 100, minY: 0, maxY: 50 },
      200,
      200,
      0,
    );
    expect(points[0]?.x).toBe(0);
    expect(points[0]?.y).toBe(200);
    expect(points[1]?.x).toBe(200);
    expect(points[1]?.y).toBe(0);
  });
});

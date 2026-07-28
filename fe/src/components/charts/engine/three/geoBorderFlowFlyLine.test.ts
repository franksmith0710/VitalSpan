import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createGeoBorderFlyLine,
  resolveFlyLinePixelSize,
  resolveFlyLineWindowPoints,
} from "./geoBorderFlowFlyLine";

describe("geoBorderFlowFlyLine", () => {
  const ring = [
    { ax: 0, ay: 0, bx: 4, by: 0 },
    { ax: 4, ay: 0, bx: 4, by: 3 },
    { ax: 4, ay: 3, bx: 0, by: 3 },
    { ax: 0, ay: 3, bx: 0, by: 0 },
  ];

  it("resolves window and pixel size from trail length", () => {
    expect(resolveFlyLineWindowPoints(48)).toBe(50);
    expect(resolveFlyLineWindowPoints(96)).toBeGreaterThan(50);
    expect(resolveFlyLinePixelSize(48)).toBe(16);
    expect(resolveFlyLinePixelSize(96)).toBeGreaterThan(16);
  });

  it("creates points geometry with percent attribute", () => {
    const flyLine = createGeoBorderFlyLine(ring, 0.5, 0xffffff, 1, 48);
    const geom = flyLine.points.geometry;
    expect(geom.getAttribute("position")?.count).toBeGreaterThanOrEqual(200);
    expect(geom.getAttribute("percent")?.count).toBeGreaterThanOrEqual(200);
    const mat = flyLine.points.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uPixelSize?.value).toBeLessThanOrEqual(28);
    flyLine.update(1 / 60, 4);
    flyLine.dispose();
  });
});

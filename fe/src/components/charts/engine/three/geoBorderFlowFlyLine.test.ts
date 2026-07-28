import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createGeoBorderFlyLine,
  resolveFlyLinePixelSize,
  resolveFlyLineWindowPoints,
  resolveFlyLineWorldSize,
} from "./geoBorderFlowFlyLine";

describe("geoBorderFlowFlyLine", () => {
  const ring = [
    { ax: 0, ay: 0, bx: 4, by: 0 },
    { ax: 4, ay: 0, bx: 4, by: 3 },
    { ax: 4, ay: 3, bx: 0, by: 3 },
    { ax: 0, ay: 3, bx: 0, by: 0 },
  ];

  it("resolves window and world size from trail / path length", () => {
    expect(resolveFlyLineWindowPoints(48)).toBe(50);
    expect(resolveFlyLineWindowPoints(96)).toBeGreaterThan(50);
    expect(resolveFlyLinePixelSize(48)).toBe(24);
    expect(resolveFlyLineWorldSize(140)).toBeGreaterThan(0);
    expect(resolveFlyLineWorldSize(140)).toBeLessThanOrEqual(10);
  });

  it("creates Demo0-style points with percent attribute", () => {
    const flyLine = createGeoBorderFlyLine(ring, 0.5, 0xffffff, 1, 48);
    const geom = flyLine.points.geometry;
    expect(geom.getAttribute("position")?.count).toBeGreaterThanOrEqual(200);
    expect(geom.getAttribute("percent")?.count).toBeGreaterThanOrEqual(200);
    const mat = flyLine.points.material as THREE.PointsMaterial;
    expect(mat).toBeInstanceOf(THREE.PointsMaterial);
    expect(mat.size).toBeGreaterThan(0);
    expect(mat.size).toBeLessThanOrEqual(10);
    flyLine.update(1 / 60, 4);
    flyLine.dispose();
  });
});

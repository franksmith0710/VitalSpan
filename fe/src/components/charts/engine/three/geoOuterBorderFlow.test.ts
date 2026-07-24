import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  pickOuterPerimeterSegments,
  ringToSegments,
  buildGeoOuterBorderFlowLines,
} from "./geoOuterBorderFlow";

const identityProject = (coord: [number, number]) => coord;

function rectPolygon(x: number, y: number, w: number, h: number): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]],
  };
}

describe("geoOuterBorderFlow", () => {
  it("drops shared interior edges between adjacent regions", () => {
    const left = rectPolygon(0, 0, 1, 1);
    const right = rectPolygon(1, 0, 1, 1);
    const outer = pickOuterPerimeterSegments([left, right], identityProject);
    const shared = outer.some(
      (seg) =>
        Math.abs(seg.ax - 1) < 0.05 &&
        Math.abs(seg.bx - 1) < 0.05 &&
        ((seg.ay < 0.05 && seg.by > 0.95) || (seg.by < 0.05 && seg.ay > 0.95)),
    );
    expect(shared).toBe(false);
    expect(outer.length).toBe(6);
  });

  it("keeps full outer ring for a single region", () => {
    const shape = rectPolygon(0, 0, 2, 1);
    const outer = pickOuterPerimeterSegments([shape], identityProject);
    expect(outer).toHaveLength(ringToSegments(shape.coordinates[0] as [number, number][]).length);
  });

  it("builds flow lines only on outer perimeter", () => {
    const left = rectPolygon(0, 0, 1, 1);
    const right = rectPolygon(1, 0, 1, 1);
    const lines = buildGeoOuterBorderFlowLines(
      [left, right],
      identityProject,
      1,
      0x7dd3fc,
      true,
      0.9,
      {
        enabled: true,
        colorCss: "#22d3ee",
        colorHex: 0x22d3ee,
        speed: 4,
        trailLength: 48,
      },
    );
    expect(lines).not.toBeNull();
    const pos = lines!.geometry.getAttribute("position");
    expect(pos.count).toBe(12);
    lines!.geometry.dispose();
    (lines!.material as THREE.Material).dispose();
  });
});

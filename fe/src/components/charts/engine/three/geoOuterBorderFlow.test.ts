import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitChinaGeoProjection } from "@/components/charts/engine/geo/geoProjection";
import { joinOfflineMapFeatures } from "@/components/charts/engine/geo/OfflineGeoPort";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";
import {
  pickOuterPerimeterSegments,
  ringToSegments,
  chainSegmentsIntoRings,
  pickLargestAreaRing,
  pickLongestRing,
  ringAbsArea,
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

  it("chains outer segments into a closed ring", () => {
    const left = rectPolygon(0, 0, 1, 1);
    const right = rectPolygon(1, 0, 1, 1);
    const outer = pickOuterPerimeterSegments([left, right], identityProject);
    const rings = chainSegmentsIntoRings(outer);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(6);
    for (let i = 0; i < rings[0]!.length; i++) {
      const cur = rings[0]![i]!;
      const next = rings[0]![(i + 1) % rings[0]!.length]!;
      expect(Math.hypot(cur.bx - next.ax, cur.by - next.ay)).toBeLessThan(0.06);
    }
  });

  it("prefers largest landmass ring over peripheral island", () => {
    const mainland = rectPolygon(0, 0, 10, 8);
    const island = rectPolygon(12, 3, 1, 1);
    const outer = pickOuterPerimeterSegments([mainland, island], identityProject);
    const rings = chainSegmentsIntoRings(outer);
    expect(rings.length).toBeGreaterThanOrEqual(2);

    const picked = pickLargestAreaRing(outer);
    expect(ringAbsArea(picked)).toBeCloseTo(80, 0);
    expect(pickLongestRing(outer)).toEqual(picked);
  });

  it("builds flow lines only on outer perimeter", () => {
    const left = rectPolygon(0, 0, 1, 1);
    const right = rectPolygon(1, 0, 1, 1);
    const bundle = buildGeoOuterBorderFlowLines(
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
    expect(bundle).not.toBeNull();
    const pos = bundle!.lines.geometry.getAttribute("position");
    expect(pos.count).toBe(12);
    expect(bundle!.group.children).toHaveLength(2);
    bundle!.lines.geometry.dispose();
    (bundle!.lines.material as THREE.Material).dispose();
    bundle!.particles.dispose();
  });

  it("walks national outer perimeter as one closed ring", () => {
    const width = 640;
    const height = 480;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const collection = {
      type: "FeatureCollection" as const,
      features: features.map((f) => ({
        type: "Feature" as const,
        properties: { name: f.name },
        geometry: f.geometry!,
      })),
    };
    const projection = fitChinaGeoProjection(d3.geoMercator(), width, height, collection);
    const project = (coord: [number, number]) => {
      const p = projection(coord);
      return p ? ([p[0] - width / 2, -(p[1] - height / 2)] as [number, number]) : null;
    };

    const geometries = features.map((f) => f.geometry!);
    const outer = pickOuterPerimeterSegments(geometries, project);
    const rings = chainSegmentsIntoRings(outer);
    const picked = pickLargestAreaRing(outer);
    const areas = rings.map(ringAbsArea).sort((a, b) => b - a);

    expect(outer.length).toBeGreaterThan(100);
    expect(rings.length).toBeGreaterThan(0);
    expect(picked.length).toBeGreaterThan(100);
    expect(ringAbsArea(picked)).toBe(areas[0]);
    expect(areas[0]!).toBeGreaterThan((areas[1] ?? 0) * 4);

    for (let i = 0; i < picked.length; i++) {
      const cur = picked[i]!;
      const next = picked[(i + 1) % picked.length]!;
      expect(Math.hypot(cur.bx - next.ax, cur.by - next.ay)).toBeLessThan(0.15);
    }
  });
});

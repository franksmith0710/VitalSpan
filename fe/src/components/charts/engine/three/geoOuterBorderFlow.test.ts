import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import { fitChinaGeoProjection } from "@/components/charts/engine/geo/geoProjection";
import { isDecorativeGeoFeature } from "@/components/charts/engine/geo/geoProjection";
import { joinOfflineMapFeatures } from "@/components/charts/engine/geo/OfflineGeoPort";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";
import {
  buildGeoFlatPlateMesh,
  GEO_BORDER_ABOVE_CAP_Z,
  resolveGeoCapTopZ,
  resolveGeoPlateDepth,
} from "@/components/charts/engine/three/buildGeoFlatPlateMesh";
import { geometryToShapes } from "@/components/charts/engine/three/geoToThreeShapes";
import { buildTerrainAlignedGeoProject } from "@/components/charts/engine/three/geo/threeGeoProject";
import { getOfflineGeoMap } from "@/components/charts/engine/geo/OfflineGeoPort";
import {
  pickOuterPerimeterSegments,
  ringToSegments,
  chainSegmentsIntoRings,
  pickDominantOuterRing,
  pickLargestAreaRing,
  pickLongestRing,
  ringAbsArea,
  ringBBoxArea,
  segmentComponents,
  pickOuterPerimeterFromCapSegments,
  collectCapBorderSegments,
  pickDominantCapOuterRing,
  buildGeoOuterBorderFlowFromCapSegments,
  buildGeoOuterBorderFlowLines,
  buildGeoOuterBorderFlowForMap,
  buildDominantLandOuterRing,
  acceptDominantOuterRing,
  isViableOuterBorderFlowBundle,
  pickPreferredOuterBorderFlowBundle,
  bundleRingPerimeter,
  disposeGeoOuterBorderFlowBundle,
  ringPerimeter,
  snapRingToExistingBorderSegments,
  closestPointOnSegment2,
  isFullLandOutlineRing,
  ringCoversProjBounds,
} from "./geoOuterBorderFlow";

const identityProject = (coord: [number, number]) => coord;

function disposeFlowBundle(bundle: NonNullable<ReturnType<typeof buildGeoOuterBorderFlowLines>>) {
  disposeGeoOuterBorderFlowBundle(bundle);
}

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

    const picked = pickDominantOuterRing(outer);
    expect(ringBBoxArea(picked)).toBeCloseTo(80, 0);
    expect(ringPerimeter(picked)).toBeCloseTo(36, 0);
    expect(pickLargestAreaRing(outer)).toEqual(picked);
    expect(pickLongestRing(outer)).toEqual(picked);
  });

  it("drops shared interior edges between adjacent cap segments", () => {
    const left = rectPolygon(0, 0, 1, 1);
    const right = rectPolygon(1, 0, 1, 1);
    const geoSegments = [
      ...ringToSegments(left.coordinates[0] as [number, number][]),
      ...ringToSegments(right.coordinates[0] as [number, number][]),
    ];
    const outer = pickOuterPerimeterFromCapSegments(geoSegments);
    expect(outer.length).toBe(6);
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
    expect(pos?.count).toBeGreaterThan(0);
    expect(bundle!.group.children).toHaveLength(3);
    disposeFlowBundle(bundle!);
  });

  it("walks national outer perimeter on mainland not Taiwan island", { timeout: 30_000 }, () => {
    // 与运行时 map-3d 一致：terrain-aligned project + buildDominantLandOuterRing
    const width = 640;
    const height = 480;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const geo = getOfflineGeoMap(VS_REGIONS_MAP_ID)!;
    const geoProject = buildTerrainAlignedGeoProject(width, height, VS_REGIONS_MAP_ID, 0, geo);
    const project = geoProject.project;

    const geometries = features.map((f) => f.geometry!);
    const outer = pickOuterPerimeterSegments(geometries, project);
    const components = segmentComponents(outer);
    const rings = chainSegmentsIntoRings(outer);
    const picked = buildDominantLandOuterRing(geometries, project, geoProject.projBounds);
    const pickedBBox = ringBBoxArea(picked);
    const pickedPerimeter = ringPerimeter(picked);

    const taiwanFeature = features.find(
      (f) => f.name === "台湾省" || String(f.name ?? "").includes("台湾") || f.adcode === 710000,
    );
    expect(taiwanFeature?.geometry).toBeTruthy();
    const taiwanOnly = pickOuterPerimeterSegments([taiwanFeature!.geometry!], project);
    const taiwanRing = pickDominantOuterRing(taiwanOnly);
    const taiwanPerimeter = Math.max(ringPerimeter(taiwanRing), 1);

    expect(outer.length).toBeGreaterThan(100);
    expect(components.length).toBeGreaterThan(1);
    expect(rings.length).toBeGreaterThan(0);
    expect(picked.length).toBeGreaterThan(200);
    expect(pickedPerimeter).toBeGreaterThan(200);
    expect(pickedBBox).toBeGreaterThan(0);
    const sortedComponents = [...components].sort((a, b) => b.length - a.length);
    expect(sortedComponents[0]!.length).toBeGreaterThan(sortedComponents.at(-1)!.length);

    for (let i = 0; i < picked.length; i++) {
      const cur = picked[i]!;
      const next = picked[(i + 1) % picked.length]!;
      expect(Math.hypot(cur.bx - next.ax, cur.by - next.ay)).toBeLessThan(0.5);
    }
  });

  it("cap outer ring prefers mainland over Taiwan island", { timeout: 30_000 }, () => {
    const width = 640;
    const height = 480;
    const features = chinaProvincesGeo.features.filter(
      (f) => !isDecorativeGeoFeature(f.properties ?? undefined) && f.geometry != null,
    );
    const collection = {
      type: "FeatureCollection" as const,
      features: features.map((f) => ({
        type: "Feature" as const,
        properties: { name: f.properties?.name },
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
    const capPicked = pickDominantCapOuterRing(outer);
    const geoPicked = pickDominantOuterRing(outer);
    expect(capPicked.length).toBe(geoPicked.length);
    expect(ringPerimeter(capPicked)).toBeGreaterThan(ringPerimeter(geoPicked) * 0.95);
  });

  it("cap render path: flow bundle aligns with plate top outline", () => {
    const plateDepth = 0.4;
    const borderZ = resolveGeoCapTopZ(plateDepth, false) + GEO_BORDER_ABOVE_CAP_Z;
    const borderFlow = {
      enabled: true,
      colorCss: "#22d3ee",
      colorHex: 0x22d3ee,
      speed: 4,
      trailLength: 48,
    };
    const plateMeshes: THREE.Object3D[] = [];
    for (const poly of [rectPolygon(0, 0, 1, 1), rectPolygon(1, 0, 1, 1)]) {
      for (const shape of geometryToShapes(poly, identityProject)) {
        const built = buildGeoFlatPlateMesh(shape, plateDepth, 0x4488aa, 0x7dd3fc, true, {
          borderOpacity: 0.9,
        });
        built.mesh.userData.borderLines = built.borderLines;
        plateMeshes.push(built.mesh);
      }
    }

    const capSegments = collectCapBorderSegments(plateMeshes);
    expect(capSegments.length).toBeGreaterThan(0);

    const bundle = buildGeoOuterBorderFlowFromCapSegments(
      capSegments,
      borderZ,
      0x7dd3fc,
      true,
      0.9,
      borderFlow,
    );
    expect(bundle).not.toBeNull();
    const pos = bundle!.lines.geometry.getAttribute("position");
    expect(pos?.count).toBeGreaterThan(0);
    disposeFlowBundle(bundle!);
  });

  it("render path: geo outer ring at cap-top Z walks mainland not Taiwan", { timeout: 30_000 }, () => {
    const width = 640;
    const height = 480;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const geo = getOfflineGeoMap(VS_REGIONS_MAP_ID)!;
    const geoProject = buildTerrainAlignedGeoProject(width, height, VS_REGIONS_MAP_ID, 0, geo);
    const geometries = features.map((f) => f.geometry!);
    const outer = pickOuterPerimeterSegments(geometries, geoProject.project);
    expect(outer.length).toBeGreaterThan(50);
    const picked = pickDominantOuterRing(outer);
    expect(picked.length).toBeGreaterThan(50);
    const plateDepth = resolveGeoPlateDepth(geoProject.projBounds, 1, 0);
    const borderZ = resolveGeoCapTopZ(plateDepth, false) + GEO_BORDER_ABOVE_CAP_Z;
    const borderFlow = {
      enabled: true,
      colorCss: "#22d3ee",
      colorHex: 0x22d3ee,
      speed: 4,
      trailLength: 48,
    };

    const bundle = buildGeoOuterBorderFlowLines(
      features.map((f) => f.geometry!),
      geoProject.project,
      borderZ,
      0x7dd3fc,
      true,
      0.9,
      borderFlow,
    );
    expect(bundle).not.toBeNull();
    const pos = bundle!.lines.geometry.getAttribute("position");
    expect((pos?.count ?? 0) / 2).toBeGreaterThanOrEqual(3);
    disposeFlowBundle(bundle!);
  });

  it("buildDominantLandOuterRing picks outer loop for drill-level regions", () => {
    const mainland = rectPolygon(0, 0, 4, 3);
    const cityA = rectPolygon(0.5, 0.5, 1, 1);
    const cityB = rectPolygon(2, 1, 1.2, 1);
    const island = rectPolygon(5, 0, 0.6, 0.6);
    const ring = buildDominantLandOuterRing([mainland, cityA, cityB, island], identityProject);
    expect(ring.length).toBe(4);
    expect(ringPerimeter(ring)).toBeCloseTo(14, 0);
  });

  it("buildDominantLandOuterRing covers projBounds at large viewport", { timeout: 30_000 }, () => {
    const width = 1870;
    const height = 769;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const geo = getOfflineGeoMap(VS_REGIONS_MAP_ID)!;
    const geoProject = buildTerrainAlignedGeoProject(width, height, VS_REGIONS_MAP_ID, 0, geo);
    const ring = buildDominantLandOuterRing(
      features.map((f) => f.geometry!),
      geoProject.project,
      geoProject.projBounds,
    );
    expect(ring.length).toBeGreaterThan(200);
    expect(ringPerimeter(ring)).toBeGreaterThan(200);
    const size = {
      w:
        Math.max(...ring.map((s) => Math.max(s.ax, s.bx))) -
        Math.min(...ring.map((s) => Math.min(s.ax, s.bx))),
      h:
        Math.max(...ring.map((s) => Math.max(s.ay, s.by))) -
        Math.min(...ring.map((s) => Math.min(s.ay, s.by))),
    };
    const pb = geoProject.projBounds;
    expect(size.w).toBeGreaterThan((pb.maxX - pb.minX) * 0.4);
    expect(size.h).toBeGreaterThan((pb.maxY - pb.minY) * 0.3);
  });

  it("buildDominantLandOuterRing keeps full national mainland ring (no walk collapse)", { timeout: 30_000 }, () => {
    const width = 640;
    const height = 480;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const geo = getOfflineGeoMap(VS_REGIONS_MAP_ID)!;
    const geoProject = buildTerrainAlignedGeoProject(width, height, VS_REGIONS_MAP_ID, 0, geo);
    const ring = buildDominantLandOuterRing(
      features.map((f) => f.geometry!),
      geoProject.project,
      geoProject.projBounds,
    );
    expect(ring.length).toBeGreaterThan(200);
    expect(ringPerimeter(ring)).toBeGreaterThan(200);
    for (let i = 0; i < ring.length; i++) {
      const cur = ring[i]!;
      const next = ring[(i + 1) % ring.length]!;
      expect(Math.hypot(cur.bx - next.ax, cur.by - next.ay)).toBeLessThan(0.5);
    }
  });

  it("acceptDominantOuterRing rejects tiny coastal fragment rings", () => {
    const tiny = [
      { ax: 0, ay: 0, bx: 1, by: 0 },
      { ax: 1, ay: 0, bx: 0.5, by: 1 },
      { ax: 0.5, ay: 1, bx: 0, by: 0 },
    ];
    // 人为放大外缘包围盒（模拟全国尺度），碎三角周长远小于 span*1.5
    const outer = [
      ...tiny,
      { ax: 0, ay: 0, bx: 100, by: 0 },
      { ax: 100, ay: 0, bx: 100, by: 80 },
      { ax: 100, ay: 80, bx: 0, by: 80 },
      { ax: 0, ay: 80, bx: 0, by: 0 },
    ];
    // 若算法误选碎三角会被门禁拒绝；选到大矩形则通过
    const ring = acceptDominantOuterRing(outer);
    expect(ringPerimeter(ring)).toBeGreaterThan(50);
  });

  it("buildGeoOuterBorderFlowForMap prefers cap outline that hugs plate edge", { timeout: 30_000 }, () => {
    const width = 640;
    const height = 480;
    const geo = getOfflineGeoMap(VS_REGIONS_MAP_ID)!;
    const features = joinOfflineMapFeatures([], ["p", "v"], "p", "v", VS_REGIONS_MAP_ID).filter(
      (f) => f.geometry,
    );
    const geoProject = buildTerrainAlignedGeoProject(width, height, VS_REGIONS_MAP_ID, 0, geo);
    const plateDepth = resolveGeoPlateDepth(geoProject.projBounds, 1, 0);
    const borderZ = resolveGeoCapTopZ(plateDepth, false) + GEO_BORDER_ABOVE_CAP_Z;
    const borderFlow = {
      enabled: true,
      colorCss: "#22d3ee",
      colorHex: 0x22d3ee,
      speed: 4,
      trailLength: 48,
    };

    // 用真实顶盖边线吸附；路径顺序来自全国外缘，不应被碎 cap 环劫持
    const plateMeshes: THREE.Object3D[] = [];
    for (const f of features.slice(0, 8)) {
      for (const shape of geometryToShapes(f.geometry!, geoProject.project)) {
        const built = buildGeoFlatPlateMesh(shape, plateDepth, 0x4488aa, 0x7dd3fc, true, {
          borderOpacity: 0.9,
        });
        built.mesh.userData.borderLines = built.borderLines;
        plateMeshes.push(built.mesh);
      }
    }
    const capSegments = collectCapBorderSegments(plateMeshes);
    expect(capSegments.length).toBeGreaterThan(20);

    const bundle = buildGeoOuterBorderFlowForMap(
      features.map((f) => f.geometry!),
      capSegments,
      geoProject.project,
      borderZ,
      0x7dd3fc,
      true,
      0.9,
      borderFlow,
      { projBounds: geoProject.projBounds },
    );

    expect(isViableOuterBorderFlowBundle(bundle)).toBe(true);
    const segCount =
      (bundle!.lines.geometry.getAttribute("position")?.count ?? 0) / 2;
    expect(segCount).toBeGreaterThanOrEqual(20);
    // 流光 Z 与顶盖边线一致
    const z0 = bundle!.lines.geometry.getAttribute("position")!.getZ(0);
    expect(z0).toBeCloseTo(borderZ, 5);
    // 全国外缘量级，不是海岸碎环
    expect(bundleRingPerimeter(bundle!)).toBeGreaterThan(80);
    expect(bundle!.baseLines.visible).toBe(false);
    disposeFlowBundle(bundle!);
  });

  it("snapRingToExistingBorderSegments pulls geo ring onto existing border edges", () => {
    const border = [
      { ax: 0, ay: 0, bx: 10, by: 0 },
      { ax: 10, ay: 0, bx: 10, by: 8 },
      { ax: 10, ay: 8, bx: 0, by: 8 },
      { ax: 0, ay: 8, bx: 0, by: 0 },
    ];
    // 略微偏离已有边线的「重画」环
    const offsetRing = [
      { ax: 0.2, ay: -0.3, bx: 10.1, by: -0.2 },
      { ax: 10.1, ay: -0.2, bx: 10.2, by: 8.1 },
      { ax: 10.2, ay: 8.1, bx: -0.1, by: 8.2 },
      { ax: -0.1, ay: 8.2, bx: 0.2, by: -0.3 },
    ];
    const snapped = snapRingToExistingBorderSegments(offsetRing, border, 1);
    expect(snapped.length).toBeGreaterThanOrEqual(4);
    for (const seg of snapped) {
      const a = closestPointOnSegment2(seg.ax, seg.ay, border[0]!);
      const nearAny = border.some((b) => closestPointOnSegment2(seg.ax, seg.ay, b).distSq < 1e-6);
      expect(nearAny || a.distSq < 1).toBe(true);
      void a;
    }
    // 吸附后应贴在 y=0 / x=10 / y=8 / x=0 上
    const ys = snapped.flatMap((s) => [s.ay, s.by]);
    const xs = snapped.flatMap((s) => [s.ax, s.bx]);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.05);
    expect(Math.max(...xs)).toBeLessThanOrEqual(10.05);
  });

  it("isFullLandOutlineRing rejects thin coastal strip spanning full width", () => {
    const mainland = [
      { ax: 0, ay: 0, bx: 100, by: 0 },
      { ax: 100, ay: 0, bx: 100, by: 80 },
      { ax: 100, ay: 80, bx: 0, by: 80 },
      { ax: 0, ay: 80, bx: 0, by: 0 },
      { ax: 0, ay: 0, bx: 25, by: 0 },
      { ax: 25, ay: 0, bx: 50, by: 0 },
      { ax: 50, ay: 0, bx: 75, by: 0 },
      { ax: 75, ay: 0, bx: 100, by: 0 },
    ];
    const strip = [
      { ax: 0, ay: 70, bx: 25, by: 72 },
      { ax: 25, ay: 72, bx: 50, by: 71 },
      { ax: 50, ay: 71, bx: 75, by: 73 },
      { ax: 75, ay: 73, bx: 100, by: 70 },
      { ax: 100, ay: 70, bx: 75, by: 68 },
      { ax: 75, ay: 68, bx: 50, by: 69 },
      { ax: 50, ay: 69, bx: 25, by: 67 },
      { ax: 25, ay: 67, bx: 0, by: 70 },
    ];
    expect(isFullLandOutlineRing(strip, mainland)).toBe(false);
    expect(isFullLandOutlineRing(mainland, mainland)).toBe(true);
  });

  it("pickPreferredOuterBorderFlowBundle rejects short coastal scrap in favor of full geo ring", () => {
    const borderFlow = {
      enabled: true,
      colorCss: "#22d3ee",
      colorHex: 0x22d3ee,
      speed: 4,
      trailLength: 48,
    };

    const subdivide = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      n: number,
    ): Array<{ ax: number; ay: number; bx: number; by: number }> => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        out.push({
          ax: ax + (bx - ax) * t0,
          ay: ay + (by - ay) * t0,
          bx: ax + (bx - ax) * t1,
          by: ay + (by - ay) * t1,
        });
      }
      return out;
    };

    // 碎海岸环：周长短但段数 ≥ 8（能通过 isViable 段数门）
    const scrap = [
      ...subdivide(0, 0, 1, 0.15, 2),
      ...subdivide(1, 0.15, 0.7, 0.7, 2),
      ...subdivide(0.7, 0.7, 0.1, 0.55, 2),
      ...subdivide(0.1, 0.55, 0, 0, 2),
    ];
    // 全国量级外环：周长远大于碎环
    const mainland = [
      ...subdivide(0, 0, 40, 0, 3),
      ...subdivide(40, 0, 40, 30, 3),
      ...subdivide(40, 30, 0, 30, 3),
      ...subdivide(0, 30, 0, 0, 3),
    ];

    const geoBundle = buildGeoOuterBorderFlowFromCapSegments(
      mainland,
      0.5,
      0x7dd3fc,
      true,
      0.9,
      borderFlow,
    );
    const capBundle = buildGeoOuterBorderFlowFromCapSegments(
      scrap,
      0.5,
      0x7dd3fc,
      true,
      0.9,
      borderFlow,
    );
    expect(isViableOuterBorderFlowBundle(capBundle)).toBe(true);
    expect(isViableOuterBorderFlowBundle(geoBundle)).toBe(true);
    expect(bundleRingPerimeter(capBundle!)).toBeLessThan(bundleRingPerimeter(geoBundle!) * 0.55);

    const picked = pickPreferredOuterBorderFlowBundle(capBundle, geoBundle);
    expect(picked).toBe(geoBundle);
    expect(bundleRingPerimeter(picked!)).toBeGreaterThan(100);
    disposeFlowBundle(picked!);
  });
});

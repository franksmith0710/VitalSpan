import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyTerrainToExtrudeGeometry,
  lngLatToTerrainUv,
} from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";
import { CHINA_TERRAIN_BOUNDS } from "@/assets/geo/terrain/manifest";
import { nationalTerrainBounds } from "@/components/charts/engine/three/geo/chinaTerrainLoader";
import { buildThreeGeoProject, THREE_GEO_MAP_MARGIN } from "@/components/charts/engine/three/geo/threeGeoProject";
import { geometryToShapes } from "@/components/charts/engine/three/geoToThreeShapes";

describe("lngLatToTerrainUv", () => {
  it("maps southwest corner to u=0 v=1", () => {
    const [u, v] = lngLatToTerrainUv(
      CHINA_TERRAIN_BOUNDS.west,
      CHINA_TERRAIN_BOUNDS.south,
      CHINA_TERRAIN_BOUNDS,
    );
    expect(u).toBeCloseTo(0, 5);
    expect(v).toBeCloseTo(1, 5);
  });

  it("maps northeast corner to u=1 v=0", () => {
    const [u, v] = lngLatToTerrainUv(
      CHINA_TERRAIN_BOUNDS.east,
      CHINA_TERRAIN_BOUNDS.north,
      CHINA_TERRAIN_BOUNDS,
    );
    expect(u).toBeCloseTo(1, 5);
    expect(v).toBeCloseTo(0, 5);
  });

  it("clamps out-of-bounds coordinates into 0–1", () => {
    const [u, v] = lngLatToTerrainUv(0, 0, CHINA_TERRAIN_BOUNDS);
    expect(u).toBe(0);
    expect(v).toBe(1);
  });
});

describe("applyTerrainToExtrudeGeometry", () => {
  it("writes non-zero UVs on extrude top cap", () => {
    const featureCollection = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
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
          },
        },
      ],
    };
    const geoProject = buildThreeGeoProject(800, 600, [], featureCollection);
    const shapes = geometryToShapes(featureCollection.features[0].geometry, geoProject.project);
    expect(shapes.length).toBeGreaterThan(0);
    const depth = 2;
    const geometry = new THREE.ExtrudeGeometry(shapes[0], { depth, bevelEnabled: false });
    applyTerrainToExtrudeGeometry(geometry, {
      geoBounds: nationalTerrainBounds(),
      projBounds: geoProject.projBounds,
      depth,
      projection: geoProject.projection,
      viewport: geoProject.viewport,
      margin: THREE_GEO_MAP_MARGIN,
      centerX: geoProject.centerX,
      centerY: geoProject.centerY,
    });
    const uvs = geometry.attributes.uv as THREE.BufferAttribute;
    let maxU = 0;
    let maxV = 0;
    for (let i = 0; i < uvs.count; i += 1) {
      maxU = Math.max(maxU, uvs.getX(i));
      maxV = Math.max(maxV, uvs.getY(i));
    }
    expect(maxU).toBeGreaterThan(0.05);
    expect(maxV).toBeGreaterThan(0.05);
  });
});

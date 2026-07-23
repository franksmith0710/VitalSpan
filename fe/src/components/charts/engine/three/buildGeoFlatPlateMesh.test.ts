import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGeoFlatPlateMesh } from "@/components/charts/engine/three/buildGeoFlatPlateMesh";
import { nationalTerrainBounds } from "@/components/charts/engine/three/geo/chinaTerrainLoader";
import { THREE_GEO_MAP_MARGIN, buildThreeGeoProject } from "@/components/charts/engine/three/geo/threeGeoProject";

describe("buildGeoFlatPlateMesh", () => {
  it("applies terrain diffuse map to cap when terrain opts provided", () => {
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
    const shape = new THREE.Shape();
    shape.moveTo(-10, -10);
    shape.lineTo(10, -10);
    shape.lineTo(10, 10);
    shape.lineTo(-10, 10);
    shape.closePath();

    const terrainMap = new THREE.Texture();
    const built = buildGeoFlatPlateMesh(shape, 2, 0x0284c7, 0x7dd3fc, true, {
      terrainColorMap: terrainMap,
      geoBounds: nationalTerrainBounds(),
      projBounds: geoProject.projBounds,
      margin: THREE_GEO_MAP_MARGIN,
      centerX: geoProject.centerX,
      centerY: geoProject.centerY,
      projection: geoProject.projection,
      viewport: geoProject.viewport,
      dataTint: 0x0284c7,
      valueT: 0.5,
    });

    expect(built.capMaterial).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect((built.capMaterial as THREE.MeshBasicMaterial).map).toBe(terrainMap);
  });

  it("uses standard cap material when relief maps provided", () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.closePath();
    const geoProject = buildThreeGeoProject(400, 300, [], {
      type: "FeatureCollection",
      features: [],
    });
    const built = buildGeoFlatPlateMesh(shape, 1, 0x0284c7, 0x7dd3fc, true, {
      terrainColorMap: new THREE.Texture(),
      terrainNormalMap: new THREE.Texture(),
      terrainDisplacementMap: new THREE.Texture(),
      displacementScale: 2,
      reliefOn: true,
      geoBounds: nationalTerrainBounds(),
      projBounds: geoProject.projBounds,
      margin: THREE_GEO_MAP_MARGIN,
      centerX: geoProject.centerX,
      centerY: geoProject.centerY,
      projection: geoProject.projection,
      viewport: geoProject.viewport,
      dataTint: 0x0284c7,
      valueT: 0.5,
    });
    expect(built.capMaterial).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((built.capMaterial as THREE.MeshStandardMaterial).normalMap).toBeTruthy();
  });
});

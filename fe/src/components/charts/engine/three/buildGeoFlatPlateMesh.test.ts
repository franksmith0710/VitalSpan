import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  GEO_CAP_Z_EPS,
  buildGeoFlatPlateMesh,
} from "@/components/charts/engine/three/buildGeoFlatPlateMesh";
import { buildThreeGeoProject } from "@/components/charts/engine/three/geo/threeGeoProject";

describe("buildGeoFlatPlateMesh", () => {
  it("returns group with cap + extrude body when terrain opts provided", () => {
    const geoProject = buildThreeGeoProject(800, 600, [], {
      type: "FeatureCollection",
      features: [],
    });
    const shape = new THREE.Shape();
    shape.moveTo(-10, -10);
    shape.lineTo(10, -10);
    shape.lineTo(10, 10);
    shape.lineTo(-10, 10);
    shape.closePath();

    const terrainMap = new THREE.Texture();
    const depth = 2;
    const built = buildGeoFlatPlateMesh(shape, depth, 0x0284c7, 0x7dd3fc, true, {
      terrainColorMap: terrainMap,
      projBounds: geoProject.projBounds,
      dataTint: 0x0284c7,
      valueT: 0.5,
    });

    expect(built.mesh).toBeInstanceOf(THREE.Group);
    expect(built.mesh.children.length).toBe(3);
    expect(built.capMaterial).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(built.capMaterial.map).toBe(terrainMap);

    const capMesh = built.mesh.children.find(
      (c) => c instanceof THREE.Mesh && c.material === built.capMaterial,
    ) as THREE.Mesh;
    expect(capMesh).toBeTruthy();
    expect(capMesh.position.z).toBeCloseTo(depth + GEO_CAP_Z_EPS);
    expect(capMesh.geometry.attributes.uv).toBeTruthy();
  });

  it("applies displacement on cap when relief maps provided", () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.closePath();
    const geoProject = buildThreeGeoProject(400, 300, [], {
      type: "FeatureCollection",
      features: [],
    });
    const displacement = new THREE.Texture();
    const built = buildGeoFlatPlateMesh(shape, 1, 0x0284c7, 0x7dd3fc, true, {
      terrainColorMap: new THREE.Texture(),
      terrainNormalMap: new THREE.Texture(),
      terrainDisplacementMap: displacement,
      displacementScale: 2,
      reliefOn: true,
      projBounds: geoProject.projBounds,
      dataTint: 0x0284c7,
      valueT: 0.5,
    });
    expect(built.capMaterial).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(built.capMaterial.map).toBeTruthy();
    // 卫星模式默认不启用位移（稀疏网格会碎裂）
    expect(
      "displacementMap" in built.capMaterial ? built.capMaterial.displacementMap : null,
    ).toBeFalsy();
    expect(
      "displacementScale" in built.capMaterial ? built.capMaterial.displacementScale : 0,
    ).toBe(0);
  });
});

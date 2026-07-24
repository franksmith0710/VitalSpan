import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GEO_MAP_SCALE_LIMIT } from "@/components/charts/engine/geo/geoConstants";
import {
  configureThreeGeoOrbitControls,
  layoutThreeGeoMapGroup,
} from "@/components/charts/engine/three/threeGeoOrbit";

function mockMapGroup(): THREE.Group {
  const group = new THREE.Group();
  const geom = new THREE.BoxGeometry(200, 8, 120);
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
  group.add(mesh);
  return group;
}

describe("threeGeoOrbit", () => {
  it("centers map group after lay-flat rotation", () => {
    const group = mockMapGroup();
    const layout = layoutThreeGeoMapGroup(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    expect(Math.abs(center.x)).toBeLessThan(1);
    expect(Math.abs(center.z)).toBeLessThan(1);
    expect(layout.halfX).toBeGreaterThan(0);
    expect(layout.minDistance).toBeLessThan(layout.defaultDistance);
    expect(layout.maxDistance).toBeGreaterThan(layout.defaultDistance);
    expect(layout.minDistance).toBeCloseTo(layout.defaultDistance / GEO_MAP_SCALE_LIMIT.max, 4);
    expect(layout.maxDistance).toBeCloseTo(layout.defaultDistance / GEO_MAP_SCALE_LIMIT.min, 4);
  });

  it("clamps orbit pan inside map bounds", () => {
    const group = mockMapGroup();
    const layout = layoutThreeGeoMapGroup(group);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
    const canvas = document.createElement("canvas");
    const controls = {
      target: new THREE.Vector3(999, 999, 999),
      screenSpacePanning: false,
      enableDamping: false,
      dampingFactor: 0,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      minDistance: 0,
      maxDistance: 0,
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      addEventListener: vi.fn((event: string, fn: () => void) => {
        if (event === "end") (controls as { _clamp?: () => void })._clamp = fn;
      }),
      removeEventListener: vi.fn(),
      update: vi.fn(),
    };
    configureThreeGeoOrbitControls(camera, controls as never, layout, true);
    (controls as { _clamp?: () => void })._clamp?.();
    expect(Math.abs(controls.target.x)).toBeLessThanOrEqual(layout.halfX * 0.88 + 0.01);
    expect(Math.abs(controls.target.z)).toBeLessThanOrEqual(layout.halfZ * 0.88 + 0.01);
  });
});

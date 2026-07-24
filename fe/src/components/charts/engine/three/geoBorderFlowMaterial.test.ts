import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  attachBorderLineDistance,
  createGeoBorderFlowMaterial,
  trailLengthToFlowTrailWidth,
} from "./geoBorderFlowMaterial";

describe("geoBorderFlowMaterial", () => {
  it("normalizes line distance along each border ring", () => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0, 10, 0, 0, 10, 10, 0], 3),
    );
    attachBorderLineDistance(geom);
    const dist = geom.getAttribute("lineDistance") as THREE.BufferAttribute;
    expect(dist.getX(0)).toBe(0);
    expect(dist.getX(dist.count - 1)).toBeCloseTo(1, 5);
  });

  it("creates shader material with phase uniform", () => {
    const material = createGeoBorderFlowMaterial({
      baseColorHex: 0x112233,
      flowColorHex: 0x22d3ee,
      opacity: 0.9,
      trailWidth: trailLengthToFlowTrailWidth(48),
    });
    expect(material.uniforms.uPhase).toBeDefined();
    expect(material.uniforms.uTrailWidth!.value).toBeGreaterThan(0);
    material.dispose();
  });
});

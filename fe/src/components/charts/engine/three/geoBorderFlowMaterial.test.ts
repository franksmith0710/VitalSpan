import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  attachBorderLineDistance,
  computeGeoBorderFlowPhase,
  createGeoBorderFlowMaterial,
  GEO_BORDER_FLOW_DEFAULTS,
  toGeoBorderFlowDisplayPhase,
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

  it("advances phase faster when speed is higher", () => {
    const elapsed = 1;
    const slow = computeGeoBorderFlowPhase(elapsed, GEO_BORDER_FLOW_DEFAULTS.speed);
    const fast = computeGeoBorderFlowPhase(elapsed, GEO_BORDER_FLOW_DEFAULTS.speed * 2);
    expect(fast).toBeGreaterThan(slow);
  });

  it("reverses phase for clockwise display", () => {
    expect(toGeoBorderFlowDisplayPhase(0)).toBe(0);
    expect(toGeoBorderFlowDisplayPhase(0.25)).toBeCloseTo(0.75, 5);
  });
});

import * as THREE from "three";
import {
  BORDER_FLOW_TRAIL_LENGTH_DEFAULT_PX,
  BORDER_FLOW_TRAIL_LENGTH_MAX_PX,
  BORDER_FLOW_TRAIL_LENGTH_MIN_PX,
  trailLengthToMaskRadius,
} from "@/lib/screenBorderSparkle";

export type GeoBorderFlowMaterialState = {
  baseColorHex: number;
  flowColorHex: number;
  opacity: number;
  phase: number;
  trailWidth: number;
};

const VERTEX = /* glsl */ `
attribute float lineDistance;
varying float vLineDistance;
void main() {
  vLineDistance = lineDistance;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uFlowColor;
uniform float uOpacity;
uniform float uPhase;
uniform float uTrailWidth;
varying float vLineDistance;

void main() {
  float phase = fract(vLineDistance - uPhase);
  float glow = smoothstep(0.0, uTrailWidth, phase)
    * (1.0 - smoothstep(uTrailWidth, uTrailWidth * 2.0, phase));
  vec3 color = mix(uBaseColor, uFlowColor, glow);
  gl_FragColor = vec4(color, uOpacity);
}
`;

export function attachBorderLineDistance(geometry: THREE.BufferGeometry): void {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 2) return;

  const distances = new Float32Array(pos.count);
  let total = 0;
  for (let i = 0; i < pos.count; i += 2) {
    const ax = pos.getX(i);
    const ay = pos.getY(i);
    const az = pos.getZ(i);
    const bx = pos.getX(i + 1);
    const by = pos.getY(i + 1);
    const bz = pos.getZ(i + 1);
    distances[i] = total;
    total += Math.hypot(bx - ax, by - ay, bz - az);
    distances[i + 1] = total;
  }

  if (total > 0) {
    for (let i = 0; i < distances.length; i++) distances[i]! /= total;
  }

  geometry.setAttribute("lineDistance", new THREE.BufferAttribute(distances, 1));
}

export function trailLengthToFlowTrailWidth(trailLengthPx: number): number {
  const radius = trailLengthToMaskRadius(trailLengthPx);
  return Math.min(0.22, Math.max(0.04, radius / 100));
}

export function createGeoBorderFlowMaterial(
  state: Omit<GeoBorderFlowMaterialState, "phase">,
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(state.baseColorHex) },
      uFlowColor: { value: new THREE.Color(state.flowColorHex) },
      uOpacity: { value: state.opacity },
      uPhase: { value: 0 },
      uTrailWidth: { value: state.trailWidth },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.renderOrder = 25;
  return material;
}

export function applyGeoBorderFlowMaterialState(
  material: THREE.ShaderMaterial,
  state: GeoBorderFlowMaterialState,
): void {
  (material.uniforms.uBaseColor as THREE.IUniform<THREE.Color>).value.setHex(state.baseColorHex);
  (material.uniforms.uFlowColor as THREE.IUniform<THREE.Color>).value.setHex(state.flowColorHex);
  material.uniforms.uOpacity!.value = state.opacity;
  material.uniforms.uPhase!.value = state.phase;
  material.uniforms.uTrailWidth!.value = state.trailWidth;
}

export function isGeoBorderFlowMaterial(
  material: THREE.Material | THREE.Material[],
): material is THREE.ShaderMaterial {
  return material instanceof THREE.ShaderMaterial && "uPhase" in material.uniforms;
}

export const GEO_BORDER_FLOW_DEFAULTS = {
  speed: 4,
  trailLength: BORDER_FLOW_TRAIL_LENGTH_DEFAULT_PX,
  trailMin: BORDER_FLOW_TRAIL_LENGTH_MIN_PX,
  trailMax: BORDER_FLOW_TRAIL_LENGTH_MAX_PX,
} as const;

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
  // 单向拖尾：沿归一化弧长单向循环，首尾通过 fract 无缝衔接
  float dist = fract(vLineDistance - uPhase);
  float trail = max(uTrailWidth, 0.001);
  float head = 1.0 - smoothstep(0.0, trail * 0.07, dist);
  float tail = 1.0 - smoothstep(0.0, trail, dist);
  float glow = head * tail;
  float flow = smoothstep(0.03, 1.0, glow);
  vec3 color = mix(uBaseColor, uFlowColor, flow);
  float alpha = uOpacity * mix(0.32, 0.88, flow);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(color, alpha);
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
    const inv = 1 / total;
    for (let i = 0; i < distances.length; i++) distances[i]! *= inv;
    distances[0] = 0;
    distances[distances.length - 1] = 1;
  }

  geometry.setAttribute("lineDistance", new THREE.BufferAttribute(distances, 1));
}

export function trailLengthToFlowTrailWidth(trailLengthPx: number): number {
  const radius = trailLengthToMaskRadius(trailLengthPx);
  return Math.min(0.35, Math.max(0.06, radius / 85));
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
    blending: THREE.AdditiveBlending,
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

/** speed=4 时约 4 秒绕外轮廓一圈；speed 越大周期越短 */
export const GEO_BORDER_FLOW_LOOP_SEC = 4;

export function computeGeoBorderFlowPhase(elapsedSec: number, speed: number): number {
  const period =
    (GEO_BORDER_FLOW_LOOP_SEC * GEO_BORDER_FLOW_DEFAULTS.speed) / Math.max(speed, 0.1);
  return (elapsedSec / period) % 1;
}

/** 地图俯视顺时针：与环参数化方向相反 */
export function toGeoBorderFlowDisplayPhase(phase: number): number {
  const wrapped = ((phase % 1) + 1) % 1;
  return wrapped <= 0 ? 0 : 1 - wrapped;
}

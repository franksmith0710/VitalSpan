import * as THREE from "three";
import { GEO_BORDER_FLOW_DEFAULTS } from "@/components/charts/engine/three/geoBorderFlowMaterial";
import type { GeoBorderRingSegment } from "@/components/charts/engine/three/geoBorderFlowParticles";
import { buildGeoBorderRingPath } from "@/components/charts/engine/three/geoBorderFlowParticles";

export type GeoBorderFlyLineSystem = {
  points: THREE.Points;
  update: (deltaSec: number, speed: number) => void;
  dispose: () => void;
};

const PATH_SAMPLES = 800;
const SEGMENT_SAMPLES = 200;
const DEMO0_POINTS_PER_SEC = 60;
const DEFAULT_WINDOW_POINTS = 50;
const DEFAULT_PIXEL_SIZE = 16;

const VERTEX = /* glsl */ `
attribute float percent;
uniform float uPixelSize;
uniform float uDpr;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float scale = uDpr * 420.0 / max(-mvPosition.z, 1.0);
  gl_PointSize = max(percent * uPixelSize * scale, 0.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  float r = distance(gl_PointCoord, vec2(0.5));
  if (r > 0.5) discard;
  float alpha = pow(1.0 - r / 0.5, 5.0) * uOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

function ringToVector3Path(ring: GeoBorderRingSegment[], z: number): THREE.Vector3[] {
  if (ring.length === 0) return [];
  const pts: THREE.Vector3[] = [];
  for (const seg of ring) {
    if (pts.length === 0) {
      pts.push(new THREE.Vector3(seg.ax, seg.ay, z));
    }
    pts.push(new THREE.Vector3(seg.bx, seg.by, z));
  }
  if (pts.length > 1) {
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    if (first.distanceToSquared(last) < 1e-10) pts.pop();
  }
  return pts;
}

function buildPercentEnvelope(count: number): Float32Array {
  const half = Math.max(1, Math.floor(count / 2));
  const arr = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = i < half ? i / half : 1 - (i - half) / half;
  }
  return arr;
}

function sliceWrapped(points: THREE.Vector3[], start: number, count: number): THREE.Vector3[] {
  const total = points.length;
  if (total === 0) return [];
  const result: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    result.push(points[(start + i) % total]!);
  }
  return result;
}

export function resolveFlyLineWindowPoints(trailLengthPx: number): number {
  const ratio = trailLengthPx / GEO_BORDER_FLOW_DEFAULTS.trailLength;
  return Math.round(Math.min(90, Math.max(30, DEFAULT_WINDOW_POINTS * ratio)));
}

export function resolveFlyLinePixelSize(trailLengthPx: number): number {
  const ratio = trailLengthPx / GEO_BORDER_FLOW_DEFAULTS.trailLength;
  return Math.min(28, Math.max(8, DEFAULT_PIXEL_SIZE * ratio));
}

function createFlyLineMaterial(
  colorHex: number,
  opacity: number,
  pixelSize: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: opacity },
      uPixelSize: { value: pixelSize },
      uDpr: { value: typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** 对标 sc-datav Demo0 flyLine：沿外轮廓滑动的点状拖尾流光 */
export function createGeoBorderFlyLine(
  ring: GeoBorderRingSegment[],
  z: number,
  colorHex: number,
  opacity: number,
  trailLengthPx: number,
): GeoBorderFlyLineSystem {
  const rawPath = ringToVector3Path(ring, z);
  const pathMeta = buildGeoBorderRingPath(ring);
  if (pathMeta.totalLength <= 0 || rawPath.length < 4) {
    const empty = new THREE.Points(new THREE.BufferGeometry(), createFlyLineMaterial(colorHex, 0, 1));
    return {
      points: empty,
      update() {},
      dispose() {
        empty.geometry.dispose();
        (empty.material as THREE.Material).dispose();
      },
    };
  }

  const pixelSize = resolveFlyLinePixelSize(trailLengthPx);
  const windowPoints = resolveFlyLineWindowPoints(trailLengthPx);

  const curve = new THREE.CatmullRomCurve3(rawPath, true, "catmullrom", 0.5);
  const pathPoints = curve.getSpacedPoints(PATH_SAMPLES);

  let index =
    pathPoints.length > windowPoints
      ? Math.floor((pathPoints.length - windowPoints) * Math.random())
      : 0;

  const geometry = new THREE.BufferGeometry();
  const material = createFlyLineMaterial(colorHex, opacity, pixelSize);
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 28;
  points.frustumCulled = false;

  const scratchCurve = new THREE.CatmullRomCurve3([], false, "catmullrom", 0.5);
  let percentAttr: THREE.BufferAttribute | null = null;

  const updateGeometry = (startIdx: number) => {
    if (pathPoints.length < 4) return;
    const segment = sliceWrapped(pathPoints, startIdx, Math.min(windowPoints, pathPoints.length));
    scratchCurve.points = segment;
    const sampled = scratchCurve.getSpacedPoints(SEGMENT_SAMPLES);
    geometry.setFromPoints(sampled);
    const envelope = buildPercentEnvelope(sampled.length);
    if (!percentAttr || percentAttr.count !== envelope.length) {
      percentAttr = new THREE.BufferAttribute(envelope, 1);
      geometry.setAttribute("percent", percentAttr);
    } else {
      percentAttr.array.set(envelope);
      percentAttr.needsUpdate = true;
    }
  };

  updateGeometry(index);

  return {
    points,
    update(deltaSec, speed) {
      if (pathPoints.length < 4) return;
      const rate = DEMO0_POINTS_PER_SEC * (speed / GEO_BORDER_FLOW_DEFAULTS.speed);
      index = (index + rate * deltaSec) % pathPoints.length;
      updateGeometry(Math.floor(index));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

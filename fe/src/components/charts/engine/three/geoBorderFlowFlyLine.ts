import * as THREE from "three";
import { GEO_BORDER_FLOW_DEFAULTS } from "@/components/charts/engine/three/geoBorderFlowMaterial";
import type { GeoBorderRingSegment } from "@/components/charts/engine/three/geoBorderFlowParticles";
import { buildGeoBorderRingPath } from "@/components/charts/engine/three/geoBorderFlowParticles";

export type GeoBorderFlyLineSystem = {
  points: THREE.Points;
  update: (deltaSec: number, speed: number) => void;
  dispose: () => void;
};

/** 对标 sc-datav Demo0：整圈采样点数 */
const PATH_SAMPLES = 800;
/** 拖尾窗口取点（Demo0 num=50） */
const DEFAULT_WINDOW_POINTS = 50;
/** 窗口重采样（Demo0 getSpacedPoints(200)） */
const SEGMENT_SAMPLES = 200;
/** Demo0：index += 60 * delta */
const DEMO0_POINTS_PER_SEC = 60;

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

function densifyPolyline(
  pts: THREE.Vector3[],
  samples: number,
  closed: boolean,
): THREE.Vector3[] {
  if (pts.length < 2 || samples < 2) return pts.slice();
  const chain = pts.slice();
  if (closed) {
    const first = chain[0]!;
    const last = chain[chain.length - 1]!;
    if (first.distanceToSquared(last) > 1e-10) chain.push(first.clone());
  }

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < chain.length - 1; i++) {
    const len = chain[i]!.distanceTo(chain[i + 1]!);
    segLens.push(len);
    total += len;
  }
  if (total <= 0) return pts.slice();

  const out: THREE.Vector3[] = [];
  const n = closed ? samples : samples;
  for (let s = 0; s < n; s++) {
    const u = closed ? s / samples : s / Math.max(1, samples - 1);
    let d = u * total;
    for (let i = 0; i < segLens.length; i++) {
      const len = segLens[i]!;
      if (d <= len || i === segLens.length - 1) {
        const t = len > 0 ? Math.min(1, d / len) : 0;
        out.push(new THREE.Vector3().lerpVectors(chain[i]!, chain[i + 1]!, t));
        break;
      }
      d -= len;
    }
  }
  return out;
}

function densifyClosedPolyline(pts: THREE.Vector3[], samples: number): THREE.Vector3[] {
  return densifyPolyline(pts, samples, true);
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

/** 世界空间点尺寸：相对路径周长，保证全国尺度仍清晰可见 */
export function resolveFlyLineWorldSize(pathLength: number): number {
  if (!(pathLength > 0)) return 0.8;
  return Math.min(10, Math.max(0.6, pathLength / 400));
}

export function resolveFlyLinePixelSize(trailLengthPx: number): number {
  const ratio = trailLengthPx / GEO_BORDER_FLOW_DEFAULTS.trailLength;
  return Math.min(36, Math.max(12, 24 * ratio));
}

/**
 * 对标 sc-datav Demo0 flyLine，但路径用折线等距采样（非 CatmullRom），严丝合缝贴顶盖外缘：
 * 外轮廓 densify → 800 点 → 滑动窗口 50 点 → 折线重采样 200 → percent 三角包络软圆粒子
 */
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
    const empty = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ visible: false }),
    );
    return {
      points: empty,
      update() {},
      dispose() {
        empty.geometry.dispose();
        (empty.material as THREE.Material).dispose();
      },
    };
  }

  const windowPoints = resolveFlyLineWindowPoints(trailLengthPx);
  const worldSize = resolveFlyLineWorldSize(pathMeta.totalLength);

  // 折线等距采样（不用 CatmullRom，避免削角离岸，严丝合缝贴边）
  const pathPoints = densifyClosedPolyline(rawPath, PATH_SAMPLES);

  let index =
    pathPoints.length > windowPoints
      ? Math.floor((pathPoints.length - windowPoints) * Math.random())
      : 0;

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({
    color: colorHex,
    size: worldSize,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });

  // Demo0：percent 控制点大小 + 软圆 alpha
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "attribute float percent;\nvoid main() {",
      )
      .replace("gl_PointSize = size;", "gl_PointSize = percent * size;");
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <output_fragment>",
      `
        #include <output_fragment>
        float r = distance(gl_PointCoord, vec2(0.5));
        float alpha = pow(1.0 - r / 0.5, 6.0);
        gl_FragColor = vec4(gl_FragColor.rgb, gl_FragColor.a * alpha);
      `,
    );
  };

  const points = new THREE.Points(geometry, material);
  points.renderOrder = 28;
  points.frustumCulled = false;

  let percentAttr: THREE.BufferAttribute | null = null;

  const updateGeometry = (startIdx: number) => {
    if (pathPoints.length < 4) return;
    const segment = sliceWrapped(pathPoints, startIdx, Math.min(windowPoints, pathPoints.length));
    const sampled = densifyPolyline(segment, SEGMENT_SAMPLES, false);
    geometry.setFromPoints(sampled.length >= 2 ? sampled : segment);
    const envelope = buildPercentEnvelope(geometry.getAttribute("position")!.count);
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

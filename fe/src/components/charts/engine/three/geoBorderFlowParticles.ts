import * as THREE from "three";
import {
  createTrailDustPool,
  tickTrailDustPool,
  trailDustEnvelope,
  trailDustWobbleOffset,
  TRAIL_DUST_POOL_SIZE,
} from "@/lib/borderFlowTrailDust";
import { trailLengthToFlowTrailWidth } from "@/components/charts/engine/three/geoBorderFlowMaterial";

export type GeoBorderRingSegment = { ax: number; ay: number; bx: number; by: number };

export type GeoBorderRingPath = {
  ring: GeoBorderRingSegment[];
  cumulative: Float32Array;
  totalLength: number;
};

type RingSample = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
};

export type GeoBorderFlowParticleSystem = {
  points: THREE.Points;
  update: (phase: number, deltaSec: number, speed: number) => void;
  dispose: () => void;
};

const VERTEX = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (180.0 / max(-mvPosition.z, 1.0));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float dust = 1.0 - smoothstep(0.08, 0.5, dist);
  float alpha = vAlpha * dust;
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export function buildGeoBorderRingPath(ring: GeoBorderRingSegment[]): GeoBorderRingPath {
  const cumulative = new Float32Array(ring.length + 1);
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    cumulative[i] = total;
    const seg = ring[i]!;
    total += Math.hypot(seg.bx - seg.ax, seg.by - seg.ay);
  }
  cumulative[ring.length] = total;
  return { ring, cumulative, totalLength: total };
}

export function sampleGeoBorderRing(path: GeoBorderRingPath, t: number, z: number): RingSample {
  const total = path.totalLength;
  if (total <= 0 || path.ring.length === 0) {
    return { x: 0, y: 0, z, tx: 1, ty: 0, nx: 0, ny: 1 };
  }

  const wrapped = ((t % 1) + 1) % 1;
  let target = wrapped * total;
  if (target >= total - 1e-9) target = 0;

  for (let i = 0; i < path.ring.length; i++) {
    const start = path.cumulative[i]!;
    const end = path.cumulative[i + 1]!;
    if (target + 1e-9 < start) continue;
    if (target - 1e-9 > end) continue;

    const seg = path.ring[i]!;
    const len = end - start || 1e-6;
    const local = Math.min(1, Math.max(0, (target - start) / len));
    const x = seg.ax + (seg.bx - seg.ax) * local;
    const y = seg.ay + (seg.by - seg.ay) * local;
    const tx = (seg.bx - seg.ax) / len;
    const ty = (seg.by - seg.ay) / len;
    return { x, y, z, tx, ty, nx: -ty, ny: tx };
  }

  const seg = path.ring[0]!;
  return { x: seg.ax, y: seg.ay, z, tx: 1, ty: 0, nx: 0, ny: 1 };
}

export function createGeoBorderFlowParticles(
  ring: GeoBorderRingSegment[],
  z: number,
  colorHex: number,
  opacity: number,
  trailLengthPx: number,
): GeoBorderFlowParticleSystem {
  const path = buildGeoBorderRingPath(ring);
  const trailWidthNorm = trailLengthToFlowTrailWidth(trailLengthPx);
  const particles = createTrailDustPool(TRAIL_DUST_POOL_SIZE);
  const spawnAcc = { value: 0 };

  const positions = new Float32Array(TRAIL_DUST_POOL_SIZE * 3);
  const sizes = new Float32Array(TRAIL_DUST_POOL_SIZE);
  const alphas = new Float32Array(TRAIL_DUST_POOL_SIZE);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(colorHex) } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, material);
  points.renderOrder = 27;
  points.frustumCulled = false;

  const driftAmp = Math.max(path.totalLength * 0.00035, 0.012);
  const liftAmp = 0.004;
  const dustOpacity = opacity * 0.32;

  const syncGpu = () => {
    for (let i = 0; i < TRAIL_DUST_POOL_SIZE; i++) {
      const p = particles[i]!;
      const base = i * 3;
      if (p.life <= 0) {
        positions[base + 2] = -9999;
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }
      const sample = sampleGeoBorderRing(path, p.ringT, z);
      const { wobble, lift } = trailDustWobbleOffset(p, driftAmp, liftAmp);
      positions[base] = sample.x + sample.nx * (p.normalOff + wobble);
      positions[base + 1] = sample.y + sample.ny * (p.normalOff + wobble);
      positions[base + 2] = sample.z + lift;
      const envelope = trailDustEnvelope(p);
      alphas[i] = dustOpacity * envelope;
      sizes[i] = p.size * (0.6 + 0.4 * (p.life / p.maxLife));
    }
    geom.attributes.position!.needsUpdate = true;
    geom.attributes.aSize!.needsUpdate = true;
    geom.attributes.aAlpha!.needsUpdate = true;
  };

  return {
    points,
    update(phase, deltaSec, speed) {
      tickTrailDustPool({
        particles,
        phase,
        deltaSec,
        speed,
        trailWidthNorm,
        driftAmp,
        spawnAcc,
      });
      syncGpu();
    },
    dispose() {
      geom.dispose();
      material.dispose();
    },
  };
}

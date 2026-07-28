import * as THREE from "three";
import { getPointEffectTextures } from "@/components/charts/engine/three/geo3dPointTexture";
import type { ResolvedPointEffectsStyle } from "@/components/charts/engine/three/geo3dPointEffectsStyle";

const PILLAR_GLOW_ROTATIONS = [0, 60, 120];

function buildPillarCoreMaterial(
  colorTop: THREE.Color,
  colorBottom: THREE.Color,
  barHeight: number,
  opacity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false,
    uniforms: {
      uColor1: { value: colorTop },
      uColor2: { value: colorBottom },
      uSize: { value: barHeight },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uSize;
      uniform float uOpacity;
      void main() {
        float t = clamp(vPosition.z / max(uSize, 0.001), 0.0, 1.0);
        vec3 color = mix(uColor2, uColor1, t);
        gl_FragColor = vec4(color, uOpacity);
      }
    `,
  });
}

export type Geo3dPointPillar = {
  group: THREE.Group;
  barHeight: number;
  ringMesh: THREE.Mesh;
  dispose: () => void;
};

export function buildGeo3dPointPillar(
  barHeight: number,
  style: ResolvedPointEffectsStyle,
  span: number,
): Geo3dPointPillar {
  const textures = getPointEffectTextures();
  const colorTop = new THREE.Color(style.pointPillarColorTop);
  const colorBottom = new THREE.Color(style.pointPillarColorBottom);
  const factor = style.pointPillarHeightScale / 5;
  const coreWidth = Math.max(span * 0.028, 0.16) * factor;
  const group = new THREE.Group();

  const glow = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(span * 0.38 * factor, barHeight),
    new THREE.MeshBasicMaterial({
      transparent: true,
      color: colorBottom,
      map: textures.glowSheet,
      opacity: 0.45 * style.pointPillarOpacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    3,
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.z = barHeight * 0.5;
  glow.renderOrder = 14;
  const matrix = new THREE.Matrix4();
  const euler = new THREE.Euler();
  for (let i = 0; i < PILLAR_GLOW_ROTATIONS.length; i += 1) {
    euler.set(Math.PI / 2, (Math.PI / 180) * PILLAR_GLOW_ROTATIONS[i]!, 0);
    matrix.makeRotationFromEuler(euler);
    glow.setMatrixAt(i, matrix);
  }
  glow.instanceMatrix.needsUpdate = true;
  group.add(glow);

  const coreGeom = new THREE.BoxGeometry(coreWidth, coreWidth, barHeight);
  coreGeom.translate(0, 0, barHeight * 0.5);
  const coreMat = buildPillarCoreMaterial(
    colorTop,
    colorBottom,
    barHeight,
    style.pointPillarOpacity,
  );
  const core = new THREE.Mesh(coreGeom, coreMat);
  core.renderOrder = 15;
  group.add(core);

  const ringSize = span * 0.42 * factor;
  const ringMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(ringSize, ringSize),
    new THREE.MeshBasicMaterial({
      transparent: true,
      color: 0xffffff,
      map: textures.baseRing,
      alphaMap: textures.baseRing,
      opacity: style.pointPillarBaseRingOpacity,
      depthTest: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ringMesh.renderOrder = 13;
  group.add(ringMesh);

  return {
    group,
    barHeight,
    ringMesh,
    dispose() {
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      coreGeom.dispose();
      coreMat.dispose();
      ringMesh.geometry.dispose();
      (ringMesh.material as THREE.Material).dispose();
    },
  };
}

export function resolvePillarHeight(valueT: number, span: number, style: ResolvedPointEffectsStyle): number {
  const scale = style.pointPillarHeightScale / 5;
  const base = span * 0.38 * scale;
  return base * (0.35 + valueT * 0.65);
}

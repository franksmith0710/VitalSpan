import * as THREE from "three";
import {
  bakeFeatureHeatCanvas,
  resolveHeatBlobZScale,
  type ProjBoundsLike,
} from "@/components/charts/engine/three/geo3dHeatCanvas";
import type { JoinedMapFeature } from "@/components/charts/engine/three/geo3dRegionCentroid";
import type { ResolvedPointEffectsStyle } from "@/components/charts/engine/three/geo3dPointEffectsStyle";

const HEAT_VERT = `
uniform float uZScale;
uniform sampler2D uGreyMap;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 grey = texture2D(uGreyMap, uv);
  float height = uZScale * grey.a;
  vec3 transformed = vec3(position.x, position.y, height);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}`;

const HEAT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uHeatMap;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  vec4 heat = texture2D(uHeatMap, vUv);
  if (heat.a < 0.02) discard;
  gl_FragColor = vec4(uColor * heat.rgb, heat.a * uOpacity);
}`;

export type Geo3dHeatBlobHandle = {
  mesh: THREE.Mesh;
  dispose: () => void;
};

export function buildGeo3dHeatBlobLayer(
  features: JoinedMapFeature[],
  project: (coord: [number, number]) => [number, number] | null,
  projBounds: ProjBoundsLike,
  capTopZ: number,
  minVal: number,
  maxVal: number,
  visualMapSpan: number,
  mapScale: number,
  style: ResolvedPointEffectsStyle,
): Geo3dHeatBlobHandle | null {
  if (!style.layers.heatBlob || features.length === 0) return null;
  const canvasSize = 512;
  const baked = bakeFeatureHeatCanvas({
    width: canvasSize,
    height: canvasSize,
    features,
    project,
    bounds: projBounds,
    minValue: minVal,
    maxValue: maxVal,
    radius: style.heatBlobRadius,
    blur: style.heatBlobBlur,
  });
  const heatTexture = new THREE.CanvasTexture(baked.colorCanvas);
  heatTexture.needsUpdate = true;
  const greyTexture = new THREE.CanvasTexture(baked.greyCanvas);
  greyTexture.needsUpdate = true;

  const material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uHeatMap: { value: heatTexture },
      uGreyMap: { value: greyTexture },
      uZScale: {
        value: resolveHeatBlobZScale(visualMapSpan, style.heatBlobLift, mapScale),
      },
      uColor: { value: new THREE.Color(style.heatBlobColor) },
      uOpacity: { value: style.heatBlobOpacity },
    },
    vertexShader: HEAT_VERT,
    fragmentShader: HEAT_FRAG,
  });

  const spanX = Math.max(projBounds.maxX - projBounds.minX, 0.5);
  const spanY = Math.max(projBounds.maxY - projBounds.minY, 0.5);
  const planeWidth = spanX;
  const planeHeight = spanY;
  const segments = 200;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(planeWidth, planeHeight, segments, segments),
    material,
  );
  const centerX = (projBounds.minX + projBounds.maxX) * 0.5;
  const centerY = (projBounds.minY + projBounds.maxY) * 0.5;
  mesh.position.set(centerX, centerY, capTopZ + 0.02);
  mesh.renderOrder = 20;
  mesh.name = "geo3d-heat-blob";

  return {
    mesh,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      heatTexture.dispose();
      greyTexture.dispose();
    },
  };
}

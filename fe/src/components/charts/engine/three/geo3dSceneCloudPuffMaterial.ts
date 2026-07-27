import * as THREE from "three";

export type CloudPuffMaterialOptions = {
  opacity: number;
  color?: THREE.ColorRepresentation;
};

const VERTEX_SHADER = /* glsl */ `
attribute mat4 instanceMatrix;

varying vec3 vNormalView;
varying vec3 vViewDir;

void main() {
  mat3 instanceNormal = mat3(instanceMatrix);
  vec3 worldNormal = normalize(instanceNormal * normal);
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vNormalView = normalize(mat3(modelViewMatrix) * worldNormal);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;

varying vec3 vNormalView;
varying vec3 vViewDir;

void main() {
  float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
  float soft = smoothstep(0.06, 0.9, facing);
  float alpha = soft * uOpacity;
  if (alpha < 0.015) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

/** 软边云粒材质：中心实、边缘渐隐，叠成云团而非硬球 */
export function createCloudPuffMaterial(options: CloudPuffMaterialOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(options.color ?? 0xf0f6ff) },
      uOpacity: { value: options.opacity },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

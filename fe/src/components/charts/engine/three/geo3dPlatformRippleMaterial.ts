import * as THREE from "three";

const OPAQUE_FRAGMENT =
  parseInt(THREE.REVISION.replace(/\D+/g, ""), 10) >= 154 ? "opaque_fragment" : "output_fragment";

export type PlatformRippleUniforms = {
  uTime: { value: number };
  uSpeed: { value: number };
  uWidth: { value: number };
  uColor: { value: THREE.Color };
  uDir: { value: number };
};

export function createPlatformRippleUniforms(color: THREE.ColorRepresentation): PlatformRippleUniforms {
  return {
    uTime: { value: 0 },
    uSpeed: { value: 10 },
    uWidth: { value: 20 },
    uColor: { value: new THREE.Color(color) },
    uDir: { value: 2 },
  };
}

/** sc-datav bottom.tsx 扩散涟漪光环 */
export function applyPlatformRippleShader(
  material: THREE.MeshBasicMaterial,
  uniforms: PlatformRippleUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms = { ...shader.uniforms, ...uniforms };
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      `varying vec3 vPosition;
void main() {
  vPosition = position;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `uniform float uTime;
uniform float uSpeed;
uniform float uWidth;
uniform vec3 uColor;
uniform float uDir;
varying vec3 vPosition;
void main() {`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <${OPAQUE_FRAGMENT}>`,
      `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
float r = uTime * uSpeed;
float w = uTime * 5.0;
if (w > uWidth) { w = uWidth; }
vec2 center = vec2(0.0, 0.0);
float rDistance = distance(vPosition.xz, center);
if (uDir == 2.0) {
  rDistance = distance(vPosition.xy, center);
}
if (rDistance > r && rDistance < r + 2.0 * w) {
  float per = 0.0;
  if (rDistance < r + w) {
    per = (rDistance - r) / w;
    outgoingLight = mix(outgoingLight, uColor, per);
    gl_FragColor = vec4(outgoingLight, mix(0.0, diffuseColor.a, per));
  } else {
    per = (rDistance - r - w) / w;
    outgoingLight = mix(uColor, outgoingLight, per);
    gl_FragColor = vec4(outgoingLight, mix(diffuseColor.a, 0.0, per));
  }
} else {
  gl_FragColor = vec4(outgoingLight, 0.0);
}`,
    );
  };
  material.customProgramCacheKey = () => "geo3d-platform-ripple";
}

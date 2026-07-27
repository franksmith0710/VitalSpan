import * as THREE from "three";

export type SceneCloudMaterialOptions = {
  opacity: number;
  coverage: number;
  /** 世界空间噪声尺度，越大云块越大 */
  scale: number;
  /** 沿风向的拉伸比（>1 更条带状） */
  streak: number;
  /** 层相位，避免各层同相 */
  phase: number;
};

const VERTEX_SHADER = /* glsl */ `
varying vec2 vWorldXZ;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPos.xz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uCoverage;
uniform float uScale;
uniform float uStreak;
uniform float uPhase;
uniform vec2 uWindDir;

varying vec2 vWorldXZ;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * valueNoise(p * freq);
    freq *= 2.03;
    amp *= 0.52;
  }
  return sum;
}

void main() {
  vec2 wind = normalize(uWindDir + vec2(0.0001, 0.0));
  vec2 drift = wind * uTime * 0.22 + wind * uPhase;
  vec2 p = vWorldXZ * uScale + drift;
  vec2 warp = vec2(
    fbm(p * vec2(0.35, 0.9) + vec2(1.7, 3.1)),
    fbm(p * vec2(0.35, 0.9) + vec2(5.2, 1.4))
  );
  p += (warp - 0.5) * 1.35;
  vec2 streaked = vec2(p.x * uStreak, p.y);
  float base = fbm(streaked * vec2(0.42, 1.05));
  float detail = fbm(streaked * vec2(1.35, 2.4) + vec2(8.2, 2.6)) * 0.38;
  float ridge = fbm(streaked * vec2(0.18, 0.55) + vec2(20.0, 0.0)) * 0.32;
  float density = base * 0.68 + detail + ridge;
  float edge = length(vWorldXZ) * 0.028;
  float vignette = 1.0 - smoothstep(0.55, 1.0, edge);
  float low = 0.38 - uCoverage * 0.2;
  float high = 0.68 - uCoverage * 0.1;
  float alpha = smoothstep(low, high, density) * uOpacity * vignette;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(0.97, 0.985, 1.0, alpha);
}
`;

/** 世界坐标程序化云层材质（远景层状云） */
export function createSceneCloudMaterial(
  options: SceneCloudMaterialOptions,
  windDir: THREE.Vector2,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: options.phase },
      uOpacity: { value: options.opacity },
      uCoverage: { value: options.coverage },
      uScale: { value: options.scale },
      uStreak: { value: options.streak },
      uPhase: { value: options.phase },
      uWindDir: { value: windDir.clone() },
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

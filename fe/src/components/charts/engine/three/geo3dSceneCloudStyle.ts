import type { ChartGeo3dStyle } from "@/lib/chartDeStyle";

export const DEFAULT_SCENE_CLOUD_DENSITY = 0.55;
export const DEFAULT_SCENE_CLOUD_SPEED = 0.45;
export const DEFAULT_SCENE_CLOUD_HEIGHT = 1;

export type ResolvedSceneCloudOptions = {
  density: number;
  speed: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveGeo3dSceneCloudDensity(style: ChartGeo3dStyle): number {
  const raw = style.sceneCloudDensity;
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_SCENE_CLOUD_DENSITY;
  return clamp(raw, 0.1, 1);
}

export function resolveGeo3dSceneCloudSpeed(style: ChartGeo3dStyle): number {
  const raw = style.sceneCloudSpeed;
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_SCENE_CLOUD_SPEED;
  return clamp(raw, 0, 2);
}

export function resolveGeo3dSceneCloudHeight(style: ChartGeo3dStyle): number {
  const raw = style.sceneCloudHeight;
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_SCENE_CLOUD_HEIGHT;
  return clamp(raw, 0.2, 2);
}

export function resolveGeo3dSceneCloudOptions(style: ChartGeo3dStyle): ResolvedSceneCloudOptions {
  return {
    density: resolveGeo3dSceneCloudDensity(style),
    speed: resolveGeo3dSceneCloudSpeed(style),
    height: resolveGeo3dSceneCloudHeight(style),
  };
}

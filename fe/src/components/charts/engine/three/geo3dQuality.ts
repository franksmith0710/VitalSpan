import type { Geo3dRenderTier } from "./geo3dRuntime";
import { GEO3D_THREE_MIN_SHORT_SIDE } from "./geo3dRuntime";

export type Geo3dQualityLevel = "high" | "medium" | "low";

export type Geo3dQualitySetting = "auto" | Geo3dQualityLevel;

/** feature 数超过此值时 auto 模式降级 2D */
export const GEO3D_FEATURE_DEGRADE_THRESHOLD = 80;

/** 短边低于此像素时 auto 模式不用 high */
export const GEO3D_HIGH_MIN_SHORT_SIDE = 320;

export type ResolveGeo3dQualityInput = {
  quality?: Geo3dQualitySetting;
  drillDepth: number;
  featureCount: number;
  shortSide: number;
  renderTier?: Geo3dRenderTier;
};

export function resolveGeo3dQuality(input: ResolveGeo3dQualityInput): Geo3dQualityLevel {
  const forced = input.quality;
  if (forced && forced !== "auto") {
    return forced;
  }
  if (input.renderTier === "thumbnail") {
    return "low";
  }
  if (input.drillDepth >= 2 || input.featureCount > GEO3D_FEATURE_DEGRADE_THRESHOLD) {
    return "low";
  }
  if (input.shortSide < GEO3D_THREE_MIN_SHORT_SIDE) {
    return "low";
  }
  if (input.drillDepth >= 1 || input.shortSide < GEO3D_HIGH_MIN_SHORT_SIDE) {
    return "medium";
  }
  return "high";
}

export function shouldRenderGeo3d(quality: Geo3dQualityLevel): boolean {
  return quality !== "low";
}

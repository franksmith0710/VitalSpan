export type GeoMapRenderEngine = "three" | "d3-fallback";

export type GeoMapRenderResult = {
  dispose: () => void;
  engine: GeoMapRenderEngine;
  fallbackReason?: string;
};

export const GEO_MAP_FALLBACK_BANNER =
  "当前环境不支持 WebGL，已显示 2D 区域地图";

export const GEO_MAP_QUALITY_FALLBACK_BANNER =
  "区县级或要素过多时已切换为 2D 区域地图以保障流畅度";

export function resolveGeoMapFallbackBanner(reason?: string): string {
  if (reason === "quality-degraded") {
    return GEO_MAP_QUALITY_FALLBACK_BANNER;
  }
  return GEO_MAP_FALLBACK_BANNER;
}

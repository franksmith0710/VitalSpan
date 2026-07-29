export type GeoMapRenderEngine = "three" | "d3-fallback";

export type GeoMapRenderResult = {
  dispose: () => void;
  engine: GeoMapRenderEngine;
  fallbackReason?: string;
  webglApi?: "webgl2" | "webgl" | "none";
  /** 仅更新画布尺寸，避免拖拽缩放时重建 WebGL 场景 */
  resize?: (width: number, height: number) => boolean;
  /** 暂停/恢复 Three rAF（编辑态未选中、屏外） */
  setAnimationActive?: (active: boolean) => void;
};

export const GEO_MAP_WEBGL_FALLBACK_BANNER =
  "当前环境无法创建 WebGL 上下文，已显示 2D 区域地图。请检查浏览器「使用硬件加速」或更新显卡驱动。";

export const GEO_MAP_THREE_INIT_FALLBACK_BANNER =
  "3D 地图初始化失败，已显示 2D 区域地图。";

/** @deprecated 使用 resolveGeoMapFallbackBanner */
export const GEO_MAP_FALLBACK_BANNER = GEO_MAP_WEBGL_FALLBACK_BANNER;

export const GEO_MAP_QUALITY_FALLBACK_BANNER =
  "区县级或要素过多时已切换为 2D 区域地图以保障流畅度";

export const GEO_MAP_WEBGL_CAP_FALLBACK_BANNER =
  "同页 3D 地图实例过多，已切换为 2D 区域地图以保障流畅度";

export function resolveGeoMapFallbackBanner(reason?: string): string {
  if (reason === "quality-degraded") {
    return GEO_MAP_QUALITY_FALLBACK_BANNER;
  }
  if (reason === "webgl-cap-exceeded") {
    return GEO_MAP_WEBGL_CAP_FALLBACK_BANNER;
  }
  if (reason === "three-init-failed") {
    return GEO_MAP_THREE_INIT_FALLBACK_BANNER;
  }
  if (reason === "webgl-unavailable") {
    return GEO_MAP_WEBGL_FALLBACK_BANNER;
  }
  return GEO_MAP_WEBGL_FALLBACK_BANNER;
}

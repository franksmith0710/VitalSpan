export type GeoMapRenderEngine = "three" | "d3-fallback";

export type GeoMapRenderResult = {
  dispose: () => void;
  engine: GeoMapRenderEngine;
  fallbackReason?: string;
};

export const GEO_MAP_FALLBACK_BANNER =
  "当前环境不支持 WebGL，已显示 2D 区域地图";

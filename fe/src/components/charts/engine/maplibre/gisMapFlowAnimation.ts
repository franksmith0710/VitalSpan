import {
  GIS_FLOW_GLOW_LAYER_ID,
  GIS_FLOW_HUB_LAYER_ID,
  GIS_FLOW_PULSE_LAYER_ID,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";
import type { ResolvedGisFlowStyle } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

const PULSE_CYCLE_MS = 2800;
const HUB_PULSE_CYCLE_MS = 2200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setPaintSafe(map: MapLibreMap, layerId: string, key: string, value: unknown) {
  if (!map.getLayer(layerId)) return;
  try {
    map.setPaintProperty(layerId, key, value);
  } catch {
    // 样式热更新竞态时忽略单帧失败
  }
}

/** 飞线流动感：pulse 层 + 外发光 + 枢纽呼吸（rAF；兼容 MapLibre 6.x） */
export function mountGisFlowLineAnimation(
  map: MapLibreMap,
  resolved: ResolvedGisFlowStyle,
): () => void {
  if (!resolved.animate || prefersReducedMotion()) return () => {};

  let frameId = 0;
  const start = performance.now();

  const tick = (now: number) => {
    if (!map.isStyleLoaded()) {
      frameId = requestAnimationFrame(tick);
      return;
    }
    const phase = ((now - start) % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
    const wave = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);

    if (map.getLayer(GIS_FLOW_PULSE_LAYER_ID)) {
      setPaintSafe(
        map,
        GIS_FLOW_PULSE_LAYER_ID,
        "line-opacity",
        resolved.opacity * (0.35 + 0.5 * wave),
      );
      setPaintSafe(map, GIS_FLOW_PULSE_LAYER_ID, "line-blur", 0.2 + 0.8 * wave);
    }
    if (map.getLayer(GIS_FLOW_GLOW_LAYER_ID)) {
      setPaintSafe(
        map,
        GIS_FLOW_GLOW_LAYER_ID,
        "line-opacity",
        Math.min(1, resolved.opacity * (0.32 + 0.18 * wave)),
      );
    }
    if (map.getLayer(GIS_FLOW_HUB_LAYER_ID)) {
      const hubPhase = ((now - start) % HUB_PULSE_CYCLE_MS) / HUB_PULSE_CYCLE_MS;
      const pulse = 0.72 + 0.28 * Math.sin(hubPhase * Math.PI * 2);
      setPaintSafe(map, GIS_FLOW_HUB_LAYER_ID, "circle-opacity", resolved.opacity * pulse);
      setPaintSafe(map, GIS_FLOW_HUB_LAYER_ID, "circle-blur", 0.15 + 0.35 * pulse);
    }
    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);
  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
}

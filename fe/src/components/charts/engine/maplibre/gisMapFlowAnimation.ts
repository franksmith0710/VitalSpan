import {
  GIS_FLOW_GLOW_LAYER_ID,
  GIS_FLOW_HUB_LAYER_ID,
  GIS_FLOW_PULSE_LAYER_ID,
  buildFlowCometGradient,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";
import type { ResolvedGisFlowStyle } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

const COMET_CYCLE_MS = 2600;
const COMET_TRAIL = 0.26;
const HUB_PULSE_CYCLE_MS = 1800;

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

function resetFlowAnimationPaint(map: MapLibreMap, resolved: ResolvedGisFlowStyle) {
  setPaintSafe(map, GIS_FLOW_PULSE_LAYER_ID, "line-opacity", 0);
  setPaintSafe(map, GIS_FLOW_GLOW_LAYER_ID, "line-opacity", Math.min(0.35, resolved.opacity * 0.28));
  setPaintSafe(map, GIS_FLOW_HUB_LAYER_ID, "circle-blur", 0.12);
}

/**
 * OD 飞线彗星动画：沿弧线从起点流向终点的 line-trim-offset + line-gradient 脉冲
 * （对标 ECharts lines effect / DataEase 动态飞线）。
 */
export function mountGisFlowLineAnimation(
  map: MapLibreMap,
  resolved: ResolvedGisFlowStyle,
): () => void {
  if (!resolved.animate || prefersReducedMotion()) {
    resetFlowAnimationPaint(map, resolved);
    return () => {};
  }

  let frameId = 0;
  const start = performance.now();

  const tick = (now: number) => {
    if (!map.isStyleLoaded()) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    const phase = ((now - start) % COMET_CYCLE_MS) / COMET_CYCLE_MS;
    const head = phase;
    const tail = Math.max(0, head - COMET_TRAIL);

    if (map.getLayer(GIS_FLOW_PULSE_LAYER_ID)) {
      setPaintSafe(map, GIS_FLOW_PULSE_LAYER_ID, "line-trim-offset", [
        tail,
        Math.min(1, head + 0.002),
      ]);
      setPaintSafe(
        map,
        GIS_FLOW_PULSE_LAYER_ID,
        "line-gradient",
        buildFlowCometGradient(resolved.color, head, tail),
      );
      setPaintSafe(map, GIS_FLOW_PULSE_LAYER_ID, "line-opacity", resolved.opacity);
      setPaintSafe(map, GIS_FLOW_PULSE_LAYER_ID, "line-blur", 0.35 + 0.25 * head);
    }

    if (map.getLayer(GIS_FLOW_GLOW_LAYER_ID)) {
      setPaintSafe(
        map,
        GIS_FLOW_GLOW_LAYER_ID,
        "line-opacity",
        Math.min(0.45, resolved.opacity * (0.18 + 0.12 * head)),
      );
    }

    if (map.getLayer(GIS_FLOW_HUB_LAYER_ID)) {
      const hubPhase = ((now - start) % HUB_PULSE_CYCLE_MS) / HUB_PULSE_CYCLE_MS;
      const pulse = 0.55 + 0.45 * Math.sin(hubPhase * Math.PI * 2);
      setPaintSafe(map, GIS_FLOW_HUB_LAYER_ID, "circle-blur", 0.2 + 0.45 * pulse);
    }

    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);
  return () => {
    if (frameId) cancelAnimationFrame(frameId);
    resetFlowAnimationPaint(map, resolved);
  };
}

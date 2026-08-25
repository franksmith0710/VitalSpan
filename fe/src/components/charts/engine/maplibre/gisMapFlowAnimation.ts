import {
  GIS_FLOW_HUB_LAYER_ID,
  GIS_FLOW_PULSE_LAYER_ID,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";
import type { ResolvedGisFlowStyle } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

const PULSE_CYCLE_MS = 2800;
const PULSE_SPAN = 0.14;
const HUB_PULSE_CYCLE_MS = 2200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 飞线流动光点 + 枢纽呼吸灯（rAF；尊重 prefers-reduced-motion） */
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
    const pulseLayer = map.getLayer(GIS_FLOW_PULSE_LAYER_ID);
    if (pulseLayer) {
      const phase = ((now - start) % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
      const head = phase;
      const tail = Math.min(1, head + PULSE_SPAN);
      map.setPaintProperty(GIS_FLOW_PULSE_LAYER_ID, "line-trim-offset", [head, tail]);
      map.setPaintProperty(
        GIS_FLOW_PULSE_LAYER_ID,
        "line-opacity",
        resolved.opacity * (0.65 + 0.35 * Math.sin(phase * Math.PI * 2)),
      );
    }
    const hubLayer = map.getLayer(GIS_FLOW_HUB_LAYER_ID);
    if (hubLayer) {
      const hubPhase = ((now - start) % HUB_PULSE_CYCLE_MS) / HUB_PULSE_CYCLE_MS;
      const pulse = 0.72 + 0.28 * Math.sin(hubPhase * Math.PI * 2);
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-opacity", resolved.opacity * pulse);
      map.setPaintProperty(GIS_FLOW_HUB_LAYER_ID, "circle-blur", 0.15 + 0.35 * pulse);
    }
    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);
  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
}

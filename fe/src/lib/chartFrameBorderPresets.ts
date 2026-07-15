import type { CSSProperties } from "react";
import { DATAEASE_BOARD_SVGS } from "@/lib/chartFrameBorderSvgs";

export const CHART_FRAME_BORDER_PRESETS = [
  { id: "frame-1", label: "边框1" },
  { id: "frame-2", label: "边框2" },
  { id: "frame-3", label: "边框3" },
  { id: "frame-4", label: "边框4" },
  { id: "frame-5", label: "边框5" },
  { id: "frame-6", label: "边框6" },
  { id: "frame-7", label: "边框7" },
  { id: "frame-8", label: "边框8" },
  { id: "frame-9", label: "边框9" },
] as const;

export type ChartFramePresetId = (typeof CHART_FRAME_BORDER_PRESETS)[number]["id"];

const DEFAULT_FRAME_ID: ChartFramePresetId = "frame-1";

function normalizeFrameColor(color: string | undefined): string {
  const trimmed = color?.trim();
  if (!trimmed) return "#3370ff";
  return trimmed;
}

function resolvePresetId(presetId: string | undefined): ChartFramePresetId {
  if (presetId && presetId in DATAEASE_BOARD_SVGS) return presetId as ChartFramePresetId;
  return DEFAULT_FRAME_ID;
}

/** 对标 DataEase Board.vue：整幅 SVG 拉伸铺满，fill 着色 */
function tintBoardSvg(svg: string, color: string): string {
  return svg
    .replace(/ preserveAspectRatio="none meet"/, ' preserveAspectRatio="none"')
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(/<svg /, `<svg fill="${color}" `);
}

export function buildChartFrameBorderSvgUrl(
  presetId: string | undefined,
  color: string | undefined,
): string {
  const id = resolvePresetId(presetId);
  const raw = DATAEASE_BOARD_SVGS[id];
  const tinted = tintBoardSvg(raw, normalizeFrameColor(color));
  return `data:image/svg+xml,${encodeURIComponent(tinted)}`;
}

/** 装饰边框 overlay（整图拉伸，非 border-image 平铺） */
export function resolveChartFrameOverlayLayer(
  presetId: string | undefined,
  color: string | undefined,
  borderRadius?: CSSProperties["borderRadius"],
): CSSProperties {
  const url = buildChartFrameBorderSvgUrl(presetId, color);
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    borderRadius,
  };
}

export function chartFramePresetThumbStyle(
  presetId: string,
  color: string | undefined,
): CSSProperties {
  const url = buildChartFrameBorderSvgUrl(presetId, color);
  return {
    backgroundColor: "var(--color-gray-50, #f9fafb)",
    backgroundImage: `url("${url}")`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    border: "1px solid rgb(228 231 236 / 0.9)",
    borderRadius: 6,
    boxSizing: "border-box",
  };
}

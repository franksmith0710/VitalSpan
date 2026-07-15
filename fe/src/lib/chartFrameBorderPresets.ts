import type { CSSProperties } from "react";

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

const FRAME_SLICE = 24;
const FRAME_WIDTH = 12;

function normalizeFrameColor(color: string | undefined): string {
  const trimmed = color?.trim();
  if (!trimmed) return "#3370ff";
  return trimmed;
}

function framePaths(variant: number): string {
  const v = ((variant - 1) % 9) + 1;
  const common = `fill="currentColor"`;
  switch (v) {
    case 1:
      return `<path ${common} d="M0 0h18v3H3v15H0zm46 0h18v18h-3V3H46zM0 46h15v3H3v15H0zm49 46v-15h3v18H46z"/>`;
    case 2:
      return `<path ${common} d="M0 0h22v2H2v20H0zm42 0h22v22h-2V2H42zM0 42h20v2H2v20H0zm44 42h20v2H2v20H0z"/><path ${common} opacity="0.45" d="M6 6h10v2H6zm48 6h10v10h-2V6zm6 48h10v2H6zm48 48h10v-10h2v12H48z"/>`;
    case 3:
      return `<path ${common} stroke="currentColor" stroke-width="2" fill="none" d="M2 14V2h12M50 2h12v12M2 50h12v12M50 62V50H62"/>`;
    case 4:
      return `<path ${common} d="M0 0h16v4H4v12H0zm48 0h16v16h-4V4H48zM0 48h12v4H4v12H0zm52 48h12v16h-4v-12H52z"/><circle cx="8" cy="8" r="2"/><circle cx="56" cy="8" r="2"/><circle cx="8" cy="56" r="2"/><circle cx="56" cy="56" r="2"/>`;
    case 5:
      return `<path ${common} d="M0 0h24v2H2v22H0zm40 0h24v24h-2V2H40zM0 40h22v2H2v22H0zm42 40h22v2H2v22H0z"/><path ${common} opacity="0.5" d="M10 0v8H0v2h12V0zm52 0h-8v10h2V0zm0 52v-8H52v2h12zm-62 0h8V54H0v10z"/>`;
    case 6:
      return `<path ${common} d="M0 0h20v3H3v17H0zm44 0h20v20h-3V3H44zM0 44h17v3H3v17H0zm47 44h17v3H3v17H0z"/><path ${common} opacity="0.35" d="M30 0h4v64h-4zM0 30h64v4H0z"/>`;
    case 7:
      return `<path ${common} stroke="currentColor" stroke-width="3" fill="none" d="M1 18V1h17M47 1h17v17M1 47h17v17M47 64V47h17"/>`;
    case 8:
      return `<path ${common} d="M0 0h26v2H2v24H0zm38 0h26v26h-2V2H38zM0 38h24v2H2v24H0zm40 38h24v2H2v24H0z"/><rect x="12" y="0" width="40" height="2"/><rect x="0" y="12" width="2" height="40"/><rect x="62" y="12" width="2" height="40"/><rect x="12" y="62" width="40" height="2"/>`;
    default:
      return `<path ${common} d="M0 0h14v4H4v10H0zm50 0h14v14h-4V4H50zM0 50h10v4H4v10H0zm54 50h10v14h-4v-10H54z"/><path ${common} opacity="0.55" d="M20 0l4 6-4 6H18l3-6-3-6zm24 0h2l3 6-3 6h-2l4-6zm0 48l4 6-4 6h-2l3-6-3-6zm-24 0h2l3 6-3 6H20l4-6z"/>`;
  }
}

export function buildChartFrameBorderSvgUrl(
  presetId: string | undefined,
  color: string | undefined,
): string {
  const match = /^frame-(\d+)$/.exec(presetId ?? "frame-1");
  const variant = match ? Number.parseInt(match[1], 10) : 1;
  const tint = normalizeFrameColor(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" color="${tint}">${framePaths(variant)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function resolveChartFrameBorderStyle(
  presetId: string | undefined,
  color: string | undefined,
): CSSProperties {
  const url = buildChartFrameBorderSvgUrl(presetId, color);
  return {
    borderStyle: "solid",
    borderWidth: FRAME_WIDTH,
    borderColor: "transparent",
    borderImageSource: `url("${url}")`,
    borderImageSlice: `${FRAME_SLICE} fill`,
    borderImageWidth: FRAME_WIDTH,
    borderImageRepeat: "round",
    boxSizing: "border-box",
  };
}

/** 装饰边框 overlay 层（absolute inset-0），避免主容器 overflow/圆角裁切 */
export function resolveChartFrameOverlayLayer(
  presetId: string | undefined,
  color: string | undefined,
  borderRadius?: CSSProperties["borderRadius"],
): CSSProperties {
  return {
    ...resolveChartFrameBorderStyle(presetId, color),
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
    border: "1px solid rgb(228 231 236 / 0.9)",
    borderImageSource: `url("${url}")`,
    borderImageSlice: `${FRAME_SLICE} fill`,
    borderImageWidth: 6,
    borderImageRepeat: "round",
    boxSizing: "border-box",
  };
}

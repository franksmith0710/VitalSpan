import type { CSSProperties } from "react";

export const GAP_PRESET_PX = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
} as const;

export type GapPreset = keyof typeof GAP_PRESET_PX | "custom";
export type ScaleMode = "canvas" | "component";
export type ColorScheme = "light" | "dark";
export type NumberFormatType = "number" | "percent" | "currency";

export type WidgetStyleConfig = {
  background?: string;
  opacity?: number;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
};

export type TitleStyleConfig = {
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
};

export type FilterChromeStyleConfig = {
  titlePosition?: "top" | "left";
  titleColor?: string;
};

export type FilterControlStyleConfig = {
  borderRadius?: number;
  height?: number;
};

export type NumberFormatConfig = {
  decimals?: number;
  type?: NumberFormatType;
  unit?: string;
};

export type DashboardStyleConfig = {
  colorScheme?: ColorScheme;
  themeAccent?: string;
  fontFamily?: string;
  gapPreset?: GapPreset;
  widgetGap?: number;
  pixelGutter?: number;
  scaleMode?: ScaleMode;
  canvasBackground?: string;
  canvasBackgroundImage?: string;
  refreshIntervalSec?: number;
  defaultQueryLimit?: number;
  widgetStyle?: WidgetStyleConfig;
  paletteId?: string;
  paletteColors?: string[];
  titleStyle?: TitleStyleConfig;
  filterChromeStyle?: FilterChromeStyleConfig;
  filterControlStyle?: FilterControlStyleConfig;
  numberFormat?: NumberFormatConfig;
  actionIconColor?: string;
  drillLevelColors?: string[];
};

export const CANVAS_BG_SWATCHES = [
  "#ffffff",
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#0f172a",
  "#1e293b",
] as const;

export const DEFAULT_WIDGET_GAP = 8;
export const DEFAULT_PIXEL_GUTTER = 0;
export const DEFAULT_SCALE_MODE: ScaleMode = "canvas";
export const DEFAULT_QUERY_LIMIT = 100;
export const MIN_QUERY_LIMIT = 1;
export const MAX_QUERY_LIMIT = 10000;

export function resolveWidgetGap(config: DashboardStyleConfig): number {
  const preset = config.gapPreset;
  if (preset && preset !== "custom" && preset in GAP_PRESET_PX) {
    return GAP_PRESET_PX[preset as keyof typeof GAP_PRESET_PX];
  }
  return config.widgetGap ?? DEFAULT_WIDGET_GAP;
}

export function resolvePixelGutter(config: DashboardStyleConfig): number {
  const gutter = config.pixelGutter ?? DEFAULT_PIXEL_GUTTER;
  return Math.min(12, Math.max(0, gutter));
}

export function resolveQueryLimit(config: DashboardStyleConfig): number {
  const limit = config.defaultQueryLimit ?? DEFAULT_QUERY_LIMIT;
  return Math.min(MAX_QUERY_LIMIT, Math.max(MIN_QUERY_LIMIT, limit));
}

export function styleConfigHasPersistedFields(config: DashboardStyleConfig): boolean {
  return Object.entries(config).some(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "object") return Object.keys(value as object).length > 0;
    return true;
  });
}

export function canvasSurfaceStyle(config: DashboardStyleConfig): CSSProperties {
  const style: CSSProperties = {};
  if (config.canvasBackground) style.background = config.canvasBackground;
  if (config.canvasBackgroundImage) {
    style.backgroundImage = `url(${config.canvasBackgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
}

export function mergeTitleStyle(
  global: TitleStyleConfig | undefined,
  override?: TitleStyleConfig,
): CSSProperties {
  const merged = { ...global, ...override };
  const style: CSSProperties = {};
  if (merged.fontSize != null) style.fontSize = `${merged.fontSize}px`;
  if (merged.color) style.color = merged.color;
  if (merged.fontWeight != null) style.fontWeight = merged.fontWeight;
  if (merged.align) style.textAlign = merged.align;
  if (merged.letterSpacing != null) style.letterSpacing = `${merged.letterSpacing}px`;
  return style;
}

export function mergeWidgetShellStyle(
  global: WidgetStyleConfig | undefined,
): { className: string; style: CSSProperties } {
  const style: CSSProperties = {};
  if (global?.background) style.background = global.background;
  if (global?.opacity != null) style.opacity = global.opacity;
  if (global?.borderRadius != null) style.borderRadius = `${global.borderRadius}px`;
  if (global?.borderColor || global?.borderWidth) {
    style.borderStyle = global.borderStyle ?? "solid";
    style.borderColor = global.borderColor ?? "var(--color-gray-200)";
    style.borderWidth = global.borderWidth ?? 1;
  }
  return { className: "", style };
}

export function formatMetricValue(
  raw: unknown,
  format: NumberFormatConfig | undefined,
): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = Number(raw);
  if (Number.isNaN(n) || String(raw).trim() === "") return String(raw);
  const decimals = format?.decimals ?? 0;
  const type = format?.type ?? "number";
  let text: string;
  if (type === "percent") {
    text = `${(n * 100).toFixed(decimals)}%`;
  } else if (type === "currency") {
    text = n.toLocaleString("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    text = n.toLocaleString("zh-CN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  if (format?.unit) return `${text}${format.unit}`;
  return text;
}

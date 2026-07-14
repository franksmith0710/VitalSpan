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
export type NumberFormatType = "auto" | "number" | "percent" | "currency";

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
  /** 默认 true；对标 DE 千分符 */
  thousandSeparator?: boolean;
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

export const CANVAS_BG_RECOMMENDED = [
  { color: "#ffffff", label: "纯白" },
  { color: "#f8fafc", label: "雪色" },
  { color: "#f1f5f9", label: "雾灰" },
  { color: "#e2e8f0", label: "银灰" },
  { color: "#fef3c7", label: "暖米" },
  { color: "#ecfdf5", label: "薄荷" },
  { color: "#eff6ff", label: "浅蓝" },
  { color: "#fce7f3", label: "浅粉" },
  { color: "#0f172a", label: "墨蓝" },
  { color: "#1e293b", label: "深蓝" },
  { color: "#171717", label: "炭黑" },
] as const;

export const THEME_ACCENT_SWATCHES = [
  { color: "#465fff", label: "品牌蓝" },
  { color: "#0ba5ec", label: "天青" },
  { color: "#12b76a", label: "翠绿" },
  { color: "#f79009", label: "琥珀" },
  { color: "#ee46bc", label: "品红" },
  { color: "#6172f3", label: "靛紫" },
] as const;

export const DASHBOARD_FONT_OPTIONS = [
  { value: "", label: "系统默认" },
  { value: "Outfit, system-ui, sans-serif", label: "Outfit" },
  { value: '"Noto Sans SC", system-ui, sans-serif', label: "思源黑体" },
  { value: "Georgia, serif", label: "衬线" },
] as const;

const CANVAS_GRID_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="none" stroke="%23cbd5e1" stroke-width="0.5" d="M24 0H0v24"/></svg>',
);
const CANVAS_DOTS_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="1" cy="1" r="1" fill="%23cbd5e1"/></svg>',
);

export type CanvasDecorPreset = {
  id: string;
  label: string;
  image?: string;
  canvasBackground?: string;
  previewStyle: CSSProperties;
};

export const CANVAS_BG_DECOR_PRESETS: CanvasDecorPreset[] = [
  {
    id: "none",
    label: "无装饰",
    previewStyle: { background: "linear-gradient(135deg, #f8fafc 50%, #e2e8f0 50%)" },
  },
  {
    id: "dots",
    label: "点阵",
    image: `data:image/svg+xml,${CANVAS_DOTS_SVG}`,
    previewStyle: {
      backgroundColor: "#f8fafc",
      backgroundImage: `url("data:image/svg+xml,${CANVAS_DOTS_SVG}")`,
    },
  },
  {
    id: "grid",
    label: "细网格",
    image: `data:image/svg+xml,${CANVAS_GRID_SVG}`,
    previewStyle: {
      backgroundColor: "#ffffff",
      backgroundImage: `url("data:image/svg+xml,${CANVAS_GRID_SVG}")`,
    },
  },
  {
    id: "gradient-soft",
    label: "柔和渐变",
    image: undefined,
    canvasBackground: "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)",
    previewStyle: {
      background: "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)",
    },
  },
];

export function resolveCanvasDecorPresetId(config: DashboardStyleConfig): string {
  const image = config.canvasBackgroundImage?.trim();
  if (!image) {
    const bg = config.canvasBackground?.trim();
    if (bg?.startsWith("linear-gradient")) return "gradient-soft";
    return "none";
  }
  const preset = CANVAS_BG_DECOR_PRESETS.find((item) => item.image === image);
  return preset?.id ?? "custom";
}

export const CANVAS_BG_LIGHT_DEFAULT = "#ffffff";
export const CANVAS_BG_DARK_DEFAULT = "#0f172a";

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

export function hasUserCanvasBackground(config: DashboardStyleConfig): boolean {
  return Boolean(config.canvasBackground?.trim() || config.canvasBackgroundImage?.trim());
}

/** @deprecated use hasUserCanvasBackground */
export const hasCustomCanvasBackground = hasUserCanvasBackground;

export function canvasChromeUsesDotGrid(config: DashboardStyleConfig): boolean {
  return !hasUserCanvasBackground(config);
}

/** §5.3 用户显式设置的仪表板背景（与主题无关） */
export function canvasBackgroundStyle(config: DashboardStyleConfig): CSSProperties {
  const style: CSSProperties = {};
  const customBackground = config.canvasBackground?.trim();
  if (customBackground) style.background = customBackground;
  const backgroundImage = config.canvasBackgroundImage?.trim();
  if (backgroundImage) {
    style.backgroundImage = `url(${backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
}

/** 画板可见底色：用户背景优先，否则随主题默认 */
export function resolveArtboardStyle(config: DashboardStyleConfig): CSSProperties {
  const userBackground = canvasBackgroundStyle(config);
  if (Object.keys(userBackground).length > 0) return userBackground;
  return {
    background: config.colorScheme === "dark" ? CANVAS_BG_DARK_DEFAULT : CANVAS_BG_LIGHT_DEFAULT,
  };
}

/** @deprecated use resolveArtboardStyle on artboard layer; theme surface must not set background */
export function canvasSurfaceStyle(config: DashboardStyleConfig): CSSProperties {
  return resolveArtboardStyle(config);
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
  const type = format?.type ?? "auto";
  const useGrouping = format?.thousandSeparator !== false;
  let text: string;
  if (type === "percent") {
    text = `${(n * 100).toFixed(decimals)}%`;
  } else if (type === "currency") {
    text = n.toLocaleString("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  } else {
    text = n.toLocaleString("zh-CN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  }
  if (format?.unit) return `${text}${format.unit}`;
  return text;
}

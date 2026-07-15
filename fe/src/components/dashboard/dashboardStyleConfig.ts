import type { CSSProperties } from "react";
import type { DashboardThemeVariants } from "./dashboardThemeVariants";
import { getDashboardThemeTokens } from "./dashboardThemeTokens";

export const GAP_PRESET_PX = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
} as const;

/** 像素画布间隙上限 10px（对标 DE gapSize 0–10） */
export const PIXEL_GAP_PRESET_PX = {
  none: 0,
  sm: 2,
  md: 5,
  lg: 10,
} as const;

export type GapPreset = keyof typeof GAP_PRESET_PX | "custom";
export type ScaleMode = "canvas" | "component";
export type ColorScheme = "light" | "dark";
export type NumberFormatType = "auto" | "number" | "percent" | "currency";

export type SpacingMode = "unified" | "individual";

export type WidgetStyleConfig = {
  background?: string;
  backgroundImage?: string;
  opacity?: number;
  backdropBlur?: number;
  borderRadius?: number;
  borderRadiusTopLeft?: number;
  borderRadiusTopRight?: number;
  borderRadiusBottomLeft?: number;
  borderRadiusBottomRight?: number;
  radiusMode?: SpacingMode;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingMode?: SpacingMode;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
};

export type DialogStyleConfig = {
  background?: string;
  fontColor?: string;
};

/** 对标 DE 整体配置开关 */
export type DashboardChromeConfig = {
  /** 图表加载骨架/提示 */
  showChartLoadingHint?: boolean;
  /** 选中组件时显示放大/导出等悬浮操作轨 */
  showFloatingActions?: boolean;
  /** 编辑态组件标题栏操作按钮 */
  showChartActionButtons?: boolean;
  /** 编辑态画布辅助对齐网格 */
  showAuxiliaryGrid?: boolean;
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
  /** §5.3「仪表板背景」显式设置；未设置时 §5.1 主题卡片使用标准底色 */
  canvasBackgroundCustom?: boolean;
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
  dialogStyle?: DialogStyleConfig;
  chrome?: DashboardChromeConfig;
  /** 浅色/深色各自保存的视觉配置（对标 DE 双主题） */
  themeVariants?: DashboardThemeVariants;
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

export const DASHBOARD_FONT_OPTIONS = [
  { value: "", label: "默认字体 / System" },
  {
    value: '"Microsoft YaHei", "PingFang SC", sans-serif',
    label: "微软雅黑",
  },
  {
    value: '"PingFang SC", "Microsoft YaHei", sans-serif',
    label: "苹方",
  },
  { value: '"SimSun", "Songti SC", serif', label: "宋体" },
  { value: 'Arial, "Helvetica Neue", sans-serif', label: "Arial" },
  { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: '"Times New Roman", Times, serif', label: "Times New Roman" },
  { value: 'Georgia, "Times New Roman", serif', label: "Georgia" },
  { value: "Roboto, Arial, sans-serif", label: "Roboto" },
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: '"Segoe UI", Tahoma, sans-serif', label: "Segoe UI" },
  { value: "Tahoma, Arial, sans-serif", label: "Tahoma" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
] as const;

const LEGACY_DASHBOARD_FONT_MAP: Record<string, string> = {
  "Outfit, system-ui, sans-serif": DASHBOARD_FONT_OPTIONS[1].value,
  '"Noto Sans SC", system-ui, sans-serif': DASHBOARD_FONT_OPTIONS[1].value,
  '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif':
    DASHBOARD_FONT_OPTIONS[1].value,
  'Arial, Helvetica, "Helvetica Neue", sans-serif': DASHBOARD_FONT_OPTIONS[5].value,
  '"SimSun", "Songti SC", "STSong", Georgia, serif': DASHBOARD_FONT_OPTIONS[4].value,
  "Georgia, serif": DASHBOARD_FONT_OPTIONS[8].value,
};

/** 将已存 fontFamily 映射到当前选项 value */
export function resolveDashboardFontOptionValue(fontFamily?: string): string {
  if (!fontFamily) return "";
  const normalized = LEGACY_DASHBOARD_FONT_MAP[fontFamily] ?? fontFamily;
  const match = DASHBOARD_FONT_OPTIONS.find((opt) => opt.value === normalized);
  return match?.value ?? normalized;
}

export function dashboardFontSelectValue(fontFamily?: string): string {
  const resolved = resolveDashboardFontOptionValue(fontFamily);
  if (!resolved) return "__default__";
  const known = DASHBOARD_FONT_OPTIONS.some((opt) => opt.value === resolved);
  return known ? resolved : "__custom__";
}

export const DASHBOARD_REFRESH_PRESETS = [
  { value: "off", label: "请选择" },
  { value: "60", label: "1 分钟" },
  { value: "300", label: "5 分钟" },
  { value: "600", label: "10 分钟" },
  { value: "900", label: "15 分钟" },
  { value: "1800", label: "30 分钟" },
  { value: "3600", label: "60 分钟" },
  { value: "custom", label: "自定义" },
] as const;

export const DASHBOARD_QUERY_LIMIT_PRESETS = [
  { value: "100", label: "100" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
  { value: "5000", label: "5000" },
  { value: "10000", label: "10000" },
  { value: "custom", label: "自定义" },
] as const;

export function resolveDashboardRefreshPreset(sec?: number): string {
  if (sec == null || sec <= 0) return "off";
  const hit = DASHBOARD_REFRESH_PRESETS.find(
    (p) => p.value !== "off" && p.value !== "custom" && Number(p.value) === sec,
  );
  return hit?.value ?? "custom";
}

export function resolveDashboardQueryLimitPreset(limit?: number): string {
  const value = limit ?? 100;
  const hit = DASHBOARD_QUERY_LIMIT_PRESETS.find((p) => p.value !== "custom" && Number(p.value) === value);
  return hit?.value ?? "custom";
}

const CANVAS_GRID_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="none" stroke="%23cbd5e1" stroke-width="0.5" d="M24 0H0v24"/></svg>',
);
const CANVAS_DOTS_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="1" cy="1" r="1" fill="%23cbd5e1"/></svg>',
);
const CANVAS_GRID_SVG_DARK = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="none" stroke="%2394a3b8" stroke-width="0.5" d="M24 0H0v24"/></svg>',
);
const CANVAS_DOTS_SVG_DARK = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="1" cy="1" r="1.25" fill="%2394a3b8"/></svg>',
);

export type CanvasDecorPreset = {
  id: string;
  label: string;
  image?: string;
  /** 平铺装饰（点阵/网格）的瓦片尺寸；照片类背景不设 */
  tileSize?: { width: number; height: number };
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
    tileSize: { width: 16, height: 16 },
    previewStyle: {
      backgroundColor: "#f8fafc",
      backgroundImage: `url("data:image/svg+xml,${CANVAS_DOTS_SVG}")`,
      backgroundSize: "16px 16px",
      backgroundRepeat: "repeat",
    },
  },
  {
    id: "grid",
    label: "细网格",
    image: `data:image/svg+xml,${CANVAS_GRID_SVG}`,
    tileSize: { width: 24, height: 24 },
    previewStyle: {
      backgroundColor: "#ffffff",
      backgroundImage: `url("data:image/svg+xml,${CANVAS_GRID_SVG}")`,
      backgroundSize: "24px 24px",
      backgroundRepeat: "repeat",
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

export const CANVAS_BG_LIGHT_DEFAULT = "#ffffff";
export const CANVAS_BG_DARK_DEFAULT = "#0f172a";

/** 浅色主题常见默认底（与 colorScheme 冲突时随主题纠正） */
export const LIGHT_THEME_CANVAS_VALUES = new Set([
  CANVAS_BG_LIGHT_DEFAULT,
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#ffffff",
]);

export const DARK_THEME_CANVAS_VALUES = new Set([
  CANVAS_BG_DARK_DEFAULT,
  "#1e293b",
  "#171717",
  "#1e293b",
]);

export const LIGHT_WIDGET_SHELL_VALUES = new Set(["#ffffff", "#fff", "white", "rgb(255, 255, 255)"]);

export const WIDGET_SHELL_DARK_DEFAULT = "#1e293b";

export const DARK_WIDGET_SHELL_VALUES = new Set([
  WIDGET_SHELL_DARK_DEFAULT,
  CANVAS_BG_DARK_DEFAULT,
  "#171717",
  "#1d2939",
  "#475569",
]);

export function isThemeDefaultCanvasColor(
  bg: string | undefined,
  scheme: ColorScheme,
): boolean {
  if (!bg?.trim()) return true;
  const normalized = bg.trim().toLowerCase();
  const base = getDashboardThemeTokens(scheme).canvas.toLowerCase();
  if (normalized === base) return true;
  return scheme === "dark"
    ? DARK_THEME_CANVAS_VALUES.has(normalized)
    : LIGHT_THEME_CANVAS_VALUES.has(normalized);
}

export function isThemeDefaultShellBackground(
  bg: string | undefined,
  scheme: ColorScheme,
): boolean {
  if (!bg?.trim()) return true;
  const normalized = bg.trim().toLowerCase();
  const base = getDashboardThemeTokens(scheme).widgetShell.toLowerCase();
  if (normalized === base) return true;
  return scheme === "dark"
    ? DARK_WIDGET_SHELL_VALUES.has(normalized)
    : LIGHT_WIDGET_SHELL_VALUES.has(normalized);
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const normalized = hex.trim().toLowerCase();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(normalized);
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits.split("").map((char) => char + char).join("");
  }
  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const transform = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/** 浅色画布色（推荐色板亮色、常见默认底与渐变） */
export function isLightCanvasColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (LIGHT_THEME_CANVAS_VALUES.has(normalized)) return true;
  if (normalized.startsWith("linear-gradient") || normalized.startsWith("radial-gradient")) {
    return true;
  }
  for (const { color } of CANVAS_BG_RECOMMENDED) {
    if (color === normalized && !DARK_THEME_CANVAS_VALUES.has(color)) return true;
  }
  return false;
}

export function isDarkWidgetShellColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (DARK_WIDGET_SHELL_VALUES.has(normalized)) return true;
  const rgb = parseHexRgb(normalized);
  if (rgb) return relativeLuminance(...rgb) < 0.1;
  return false;
}

export function isDarkCanvasColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return DARK_THEME_CANVAS_VALUES.has(normalized);
}

export function coerceWidgetSurfaceBackground(
  value: string | undefined,
  colorScheme: ColorScheme = "light",
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return colorScheme === "dark" ? WIDGET_SHELL_DARK_DEFAULT : undefined;
  const normalized = trimmed.toLowerCase();
  if (colorScheme === "dark") {
    if (!isDarkWidgetShellColor(trimmed)) return WIDGET_SHELL_DARK_DEFAULT;
  }
  if (
    colorScheme === "light" &&
    (isDarkWidgetShellColor(trimmed) || normalized === CANVAS_BG_DARK_DEFAULT)
  ) {
    return "#ffffff";
  }
  return value;
}

/** colorScheme 与显式底色/组件底不一致时，以 colorScheme 为准（避免「挂了 dark 仍是白底」） */
export function effectiveCanvasBackground(config: DashboardStyleConfig): string | undefined {
  const scheme = config.colorScheme ?? "light";
  const hasImage = Boolean(config.canvasBackgroundImage?.trim());
  const hasCustomSolid = Boolean(config.canvasBackgroundCustom && config.canvasBackground?.trim());
  if (!hasImage && !hasCustomSolid) return undefined;

  const bg = config.canvasBackground?.trim();
  if (hasImage) {
    if (scheme === "dark" && (!bg || !isDarkCanvasColor(bg))) {
      return CANVAS_BG_DARK_DEFAULT;
    }
    return config.canvasBackground;
  }
  if (!bg) return undefined;
  if (scheme === "dark" && !isDarkCanvasColor(bg)) {
    return CANVAS_BG_DARK_DEFAULT;
  }
  if (scheme === "light" && isDarkCanvasColor(bg)) {
    return CANVAS_BG_LIGHT_DEFAULT;
  }
  return config.canvasBackground;
}

export function effectiveWidgetShellBackground(
  config: DashboardStyleConfig,
): string | undefined {
  return coerceWidgetSurfaceBackground(config.widgetStyle?.background, config.colorScheme ?? "light");
}

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

/** 切换为「无装饰」：清除纹理；若底色为柔和渐变预设则一并还原 */
export function patchDecorNoneStyle(
  config: DashboardStyleConfig,
): Partial<DashboardStyleConfig> {
  const patch: Partial<DashboardStyleConfig> = {
    canvasBackgroundImage: undefined,
    canvasBackgroundCustom: false,
    canvasBackground: undefined,
  };
  const bg = config.canvasBackground?.trim();
  const gradientSoft = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "gradient-soft");
  if (bg && gradientSoft?.canvasBackground && bg === gradientSoft.canvasBackground) {
    patch.canvasBackground = undefined;
  }
  return patch;
}

export function defaultSolidArtboardColor(scheme: ColorScheme = "light"): string {
  return scheme === "dark" ? CANVAS_BG_DARK_DEFAULT : "#f8fafc";
}

function decorTileImageForScheme(presetId: string, scheme: ColorScheme): string | undefined {
  const preset = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === presetId);
  if (!preset?.image) return undefined;
  if (scheme === "dark") {
    if (presetId === "dots") return `data:image/svg+xml,${CANVAS_DOTS_SVG_DARK}`;
    if (presetId === "grid") return `data:image/svg+xml,${CANVAS_GRID_SVG_DARK}`;
  }
  return preset.image;
}

/** 面板 / 画布统一：装饰预设 → styleConfig 补丁 */
export function patchDecorPresetStyle(
  presetId: string,
  config: DashboardStyleConfig,
): Partial<DashboardStyleConfig> {
  if (presetId === "none") return patchDecorNoneStyle(config);

  const preset = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === presetId);
  if (!preset) return {};

  if (presetId === "gradient-soft") {
    return {
      canvasBackgroundImage: undefined,
      canvasBackground: preset.canvasBackground,
      canvasBackgroundCustom: true,
    };
  }

  const scheme = config.colorScheme ?? "light";
  const existing = config.canvasBackground?.trim();
  const gradientSoft = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "gradient-soft");
  const keepSolid =
    Boolean(existing) &&
    !existing!.startsWith("linear-gradient") &&
    existing !== gradientSoft?.canvasBackground;

  return {
    canvasBackgroundImage: preset.image,
    canvasBackground: keepSolid ? existing : defaultSolidArtboardColor(scheme),
    canvasBackgroundCustom: true,
  };
}

/** 配置面板缩略图：与画布 artboard 渲染一致 */
export function decorPresetPreviewStyle(
  presetId: string,
  scheme: ColorScheme = "light",
): CSSProperties {
  return canvasBackgroundStyle({
    colorScheme: scheme,
    ...patchDecorPresetStyle(presetId, { colorScheme: scheme }),
  });
}

function resolveDecorImageStyle(
  image: string,
  scheme: ColorScheme = "light",
): Pick<
  CSSProperties,
  "backgroundImage" | "backgroundSize" | "backgroundRepeat" | "backgroundPosition"
> {
  const preset = CANVAS_BG_DECOR_PRESETS.find((item) => item.image === image);
  if (preset?.tileSize) {
    const tileUrl = decorTileImageForScheme(preset.id, scheme) ?? image;
    const { width, height } = preset.tileSize;
    return {
      backgroundImage: `url(${tileUrl})`,
      backgroundSize: `${width}px ${height}px`,
      backgroundRepeat: "repeat",
    };
  }
  return {
    backgroundImage: `url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

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
  return Math.min(10, Math.max(0, gutter));
}

export const DASHBOARD_SHAPE_GAP_VAR = "--dashboard-shape-gap";

export function resolveDashboardComponentGap(
  config: DashboardStyleConfig,
  options: { pixel?: boolean } = {},
): number {
  return options.pixel ? resolvePixelGutter(config) : resolveWidgetGap(config);
}

export function dashboardShapeGapStyle(gapPx: number): CSSProperties {
  return { [DASHBOARD_SHAPE_GAP_VAR]: `${Math.max(0, gapPx)}px` } as CSSProperties;
}

export function inferPixelGapPreset(gutter: number): GapPreset {
  if (gutter <= 0) return "none";
  for (const [key, px] of Object.entries(PIXEL_GAP_PRESET_PX)) {
    if (key !== "none" && px === gutter) return key as GapPreset;
  }
  return "custom";
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
  if (config.canvasBackgroundCustom) return true;
  return Boolean(config.canvasBackgroundImage?.trim());
}

/** @deprecated use hasUserCanvasBackground */
export const hasCustomCanvasBackground = hasUserCanvasBackground;

/** 组件树实际消费的看板样式子集（不含画布壳层 / CSS 变量类字段） */
export function pickWidgetDashboardStyle(
  config: DashboardStyleConfig,
): DashboardStyleConfig {
  return {
    colorScheme: config.colorScheme,
    defaultQueryLimit: config.defaultQueryLimit,
    paletteId: config.paletteId,
    paletteColors: config.paletteColors
      ? [...config.paletteColors]
      : undefined,
    widgetStyle: config.widgetStyle,
    titleStyle: config.titleStyle,
    filterChromeStyle: config.filterChromeStyle,
    filterControlStyle: config.filterControlStyle,
    numberFormat: config.numberFormat,
  };
}

export function widgetDashboardStyleFingerprint(
  config: DashboardStyleConfig,
): string {
  return JSON.stringify(pickWidgetDashboardStyle(config));
}

export function canvasChromeUsesDotGrid(config: DashboardStyleConfig): boolean {
  return !hasUserCanvasBackground(config);
}

/** §5.3 用户显式设置的仪表板背景（与主题无关） */
export function canvasBackgroundStyle(config: DashboardStyleConfig): CSSProperties {
  const style: CSSProperties = {};
  const scheme = config.colorScheme ?? "light";
  const backgroundImage = config.canvasBackgroundImage?.trim();
  const customSolid =
    config.canvasBackgroundCustom && config.canvasBackground?.trim()
      ? config.canvasBackground.trim()
      : undefined;

  if (backgroundImage) {
    if (customSolid?.startsWith("linear-gradient")) {
      style.background = customSolid;
    } else {
      const fill = customSolid || defaultSolidArtboardColor(scheme);
      style.backgroundColor = fill;
    }
    Object.assign(style, resolveDecorImageStyle(backgroundImage, scheme));
    return style;
  }

  if (customSolid) {
    style.background = customSolid;
  }
  return style;
}

/** 画板可见底色：用户背景优先，否则随主题（含强调色）默认 */
export function resolveArtboardStyle(config: DashboardStyleConfig): CSSProperties {
  const scheme = config.colorScheme ?? "light";
  const coerced = effectiveCanvasBackground(config);
  let working: DashboardStyleConfig = {
    ...config,
    canvasBackground: coerced ?? config.canvasBackground,
  };
  if (scheme === "dark" && working.canvasBackgroundImage?.trim()) {
    const presetId = resolveCanvasDecorPresetId(working);
    if (presetId !== "none" && presetId !== "custom") {
      working = { ...working, canvasBackgroundImage: undefined };
    }
  }
  const userBackground = canvasBackgroundStyle(working);
  if (Object.keys(userBackground).length > 0) return userBackground;
  return {
    backgroundColor:
      effectiveCanvasBackground(config) ?? getDashboardThemeTokens(scheme).canvas,
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

function resolveBoxPadding(global: WidgetStyleConfig | undefined): string | undefined {
  if (!global) return undefined;
  const mode = global.paddingMode ?? "unified";
  if (mode === "individual") {
    const top = global.paddingTop ?? global.padding ?? 0;
    const right = global.paddingRight ?? global.padding ?? 0;
    const bottom = global.paddingBottom ?? global.padding ?? 0;
    const left = global.paddingLeft ?? global.padding ?? 0;
    if (top || right || bottom || left) return `${top}px ${right}px ${bottom}px ${left}px`;
    return undefined;
  }
  if (global.padding != null) return `${global.padding}px`;
  return undefined;
}

function resolveBoxRadius(global: WidgetStyleConfig | undefined): string | undefined {
  if (!global) return undefined;
  const mode = global.radiusMode ?? "unified";
  if (mode === "individual") {
    const tl = global.borderRadiusTopLeft ?? global.borderRadius ?? 0;
    const tr = global.borderRadiusTopRight ?? global.borderRadius ?? 0;
    const br = global.borderRadiusBottomRight ?? global.borderRadius ?? 0;
    const bl = global.borderRadiusBottomLeft ?? global.borderRadius ?? 0;
    if (tl || tr || br || bl) return `${tl}px ${tr}px ${br}px ${bl}px`;
    return undefined;
  }
  if (global.borderRadius != null) return `${global.borderRadius}px`;
  return undefined;
}

export function mergeWidgetShellStyle(
  global: WidgetStyleConfig | undefined,
  colorScheme: ColorScheme = "light",
): { className: string; style: CSSProperties } {
  const style: CSSProperties = {};
  const coerced = coerceWidgetSurfaceBackground(global?.background, colorScheme);

  if (isThemeDefaultShellBackground(global?.background, colorScheme)) {
    style.backgroundColor = "var(--dashboard-widget-surface)";
  } else if (coerced) {
    style.background = coerced;
  } else {
    style.backgroundColor = "var(--dashboard-widget-surface)";
  }
  if (global?.backgroundImage) {
    style.backgroundImage = `url(${global.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (global?.opacity != null) style.opacity = global.opacity;
  if (global?.backdropBlur != null && global.backdropBlur > 0) {
    style.backdropFilter = `blur(${global.backdropBlur}px)`;
  }
  const padding = resolveBoxPadding(global);
  if (padding) style.padding = padding;
  const radius = resolveBoxRadius(global);
  if (radius) style.borderRadius = radius;
  if (global?.borderColor || global?.borderWidth) {
    style.borderStyle = global.borderStyle ?? "solid";
    style.borderColor = global.borderColor ?? "var(--dashboard-widget-border, var(--color-gray-200))";
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

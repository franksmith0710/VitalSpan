import type { CSSProperties } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type {
  DashboardStyleConfig,
  NumberFormatConfig,
  TitleStyleConfig,
  WidgetStyleConfig,
  ColorScheme,
} from "@/components/dashboard/dashboardStyleConfig";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import {
  mergeTitleStyle,
  mergeWidgetShellStyle,
} from "@/components/dashboard/dashboardStyleConfig";
import { getDashboardThemeTokens, isOppositeThemeTitleColor } from "@/components/dashboard/dashboardThemeTokens";
import type { WidgetBackgroundPresentation } from "@/lib/widgetSurfaceBackground";
import { buildWidgetBackgroundPresentation } from "@/lib/widgetStylePresentation";
import type { ChartSeriesColorItem } from "@/lib/chartSeriesColor";
import { resolvePaletteId } from "@/lib/chartPalette";
import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartDeStyleBlocks } from "@/lib/chartDeStyleBlocks";

export type { ChartSeriesColorItem } from "@/lib/chartSeriesColor";

export type ChartLegendStyle = {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  /** 图例项排列：水平 / 垂直（对标 DE「方向」） */
  orient?: "horizontal" | "vertical";
  /** 对标 DE 位置 · 水平对齐（左/中/右） */
  hAlign?: "left" | "center" | "right";
  /** 对标 DE 位置 · 垂直对齐（上/中/下） */
  vAlign?: "top" | "middle" | "bottom";
  fontSize?: number;
  color?: string;
  /** 对标 ECharts legend.icon */
  icon?: ChartLegendIconShape;
  iconSize?: number;
};

export type ChartLegendIconShape =
  | "circle"
  | "rect"
  | "roundRect"
  | "triangle"
  | "diamond";

/** 看板内嵌图例默认：开启 + 底部 */
export const DEFAULT_CHART_LEGEND_STYLE: Required<Pick<ChartLegendStyle, "show" | "position">> &
  ChartLegendStyle = {
  show: true,
  position: "bottom",
};

export type ChartLabelStyle = {
  show?: boolean;
  fontSize?: number;
  color?: string;
  formatType?: NumberFormatConfig["type"];
  thousandSeparator?: boolean;
};

export type ChartBorderStyle = {
  show?: boolean;
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
  radius?: number;
};

export type ChartRemarkStyle = {
  show?: boolean;
  text?: string;
};

export type ChartGeoStyle = {
  /** 对标 DE「地区」：离线中国省级底图（GEO-IRON-01 仅 china） */
  mapArea?: "china";
  /** 对标 DE 数据页「地区」手动下钻路径（预览/编辑共用） */
  manualDrillStack?: ChartDrillFrame[];
  roam?: boolean;
  showRegionLabel?: boolean;
  visualMap?: boolean;
  showCellLabel?: boolean;
};

export type ChartGeo3dStyle = {
  extrudeIntensity?: number;
  quality?: "auto" | "high" | "medium" | "low";
  /** 离线 hillshade 地形贴图（diffuse + normal + displacement） */
  terrainTexture?: boolean;
  /** displacement 起伏强度（非按省拔高） */
  terrainRelief?: boolean;
  /** @deprecated 不再渲染背景装饰 */
  effectsEnabled?: boolean;
  groundMirror?: boolean;
  outlineGlow?: boolean;
  beamScan?: boolean;
};

export const DEFAULT_GEO3D_EXTRUDE_INTENSITY = 1;

/** 饼图/环形图样式（对标 DE attr-style · 基础样式） */
export type ChartPieStyle = {
  /** 环形内径，占容器短边百分比 */
  innerRadiusPercent?: number;
  outerRadiusPercent?: number;
  padAngle?: number;
  topN?: number;
};

export const DEFAULT_PIE_INNER_RADIUS_PERCENT = 40;
export const DEFAULT_PIE_OUTER_RADIUS_PERCENT = 70;
export const PIE_INNER_RADIUS_MIN = 0;
export const PIE_INNER_RADIUS_MAX = 65;

export type ChartTooltipStyle = {
  show?: boolean;
  fontSize?: number;
  color?: string;
  background?: string;
};

export type ChartDeStyle = {
  paletteId?: string;
  paletteOpacity?: number;
  /** 系列渐变填充（对标 DE「渐变颜色」） */
  seriesGradient?: boolean;
  /** 立体视觉：关 / 标准 / 增强（VCDS 2.5D） */
  depthVisual?: "off" | "standard" | "enhanced";
  /** 柱/线等系列级配色（对标 DE seriesColor；优先于调色板循环色） */
  seriesColor?: ChartSeriesColorItem[];
  title?: TitleStyleConfig & { show?: boolean };
  legend?: ChartLegendStyle;
  label?: ChartLabelStyle;
  tooltip?: ChartTooltipStyle;
  background?: WidgetStyleConfig;
  border?: ChartBorderStyle;
  remark?: ChartRemarkStyle;
  geo?: ChartGeoStyle;
  geo3d?: ChartGeo3dStyle;
  pie?: ChartPieStyle;
} & ChartDeStyleBlocks;

export function readChartGeoStyle(deStyle: ChartDeStyle) {
  return deStyle.geo ?? {};
}

export function readChartGeo3dStyle(deStyle: ChartDeStyle): ChartGeo3dStyle {
  return deStyle.geo3d ?? {};
}

export function readChartPieStyle(deStyle: ChartDeStyle): ChartPieStyle {
  return deStyle.pie ?? {};
}

export function readChartDeStyle(cfg: ChartViewConfig): ChartDeStyle {
  const raw = cfg.nativeBody?.deStyle;
  if (!raw || typeof raw !== "object") return {};
  return raw as ChartDeStyle;
}

/** 组件 override → 看板默认；均未配置时 undefined（由 resolveChartColors 回退 default） */
export function resolveEffectivePaletteId(
  cfg: ChartViewConfig,
  dashboardPaletteId?: string,
): string | undefined {
  const own = readChartDeStyle(cfg).paletteId;
  if (own != null) return resolvePaletteId(own);
  if (dashboardPaletteId != null) return resolvePaletteId(dashboardPaletteId);
  return undefined;
}

/** 默认显示；组件 deStyle.title.show > 看板 titleStyle.show */
export function readChartTitleVisible(
  cfg: ChartViewConfig | undefined,
  globalTitleStyle?: Pick<TitleStyleConfig, "show">,
): boolean {
  if (cfg) {
    const show = readChartDeStyle(cfg).title?.show;
    if (show !== undefined) return show !== false;
  }
  return globalTitleStyle?.show !== false;
}

/** 图例显隐：显式 false 隐藏；未配置或 true 时显示（含看板内嵌） */
export function readChartLegendVisible(
  deStyle: ChartDeStyle,
  _options?: { embedded?: boolean },
): boolean {
  return deStyle.legend?.show !== false;
}

/** 图例位置：未配置时默认底部 */
export function readChartLegendPosition(
  deStyle: ChartDeStyle,
): NonNullable<ChartLegendStyle["position"]> {
  return deStyle.legend?.position ?? DEFAULT_CHART_LEGEND_STYLE.position;
}

export function mergeChartTitleStyle(
  global: DashboardStyleConfig["titleStyle"] | undefined,
  cfg: ChartViewConfig | undefined,
  colorScheme: ColorScheme = "light",
): CSSProperties {
  const override = cfg ? readChartDeStyle(cfg).title : undefined;
  const tokens = getDashboardThemeTokens(colorScheme);
  const mergedOverride =
    override?.color && isOppositeThemeTitleColor(override.color, colorScheme)
      ? { ...override, color: tokens.title }
      : override;
  return mergeTitleStyle(global, mergedOverride);
}

/** 看板「图表标题」修改后清除组件级 title override（含 show） */
export function stripChartTitleOverrides(cfg: ChartViewConfig): ChartViewConfig {
  const de = readChartDeStyle(cfg);
  if (!de.title) return cfg;
  const nextDe: ChartDeStyle = { ...de };
  delete nextDe.title;
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deStyle: nextDe,
    },
  };
}

/** @deprecated 使用 stripChartTitleOverrides */
export function stripChartTitlePresentationOverrides(cfg: ChartViewConfig): ChartViewConfig {
  return stripChartTitleOverrides(cfg);
}

export function syncChartWidgetsForDashboardTitleStyle(
  widgets: LayoutWidget[],
): LayoutWidget[] {
  return syncChartWidgetsForDashboardScopes(widgets, new Set(["title"]));
}

export type DashboardWidgetSyncScope =
  | "title"
  | "widgetAppearance"
  | "palette"
  | "numberFormat"
  | "queryLimit";

export function inferWidgetSyncScopes(
  patch: Partial<DashboardStyleConfig>,
): Set<DashboardWidgetSyncScope> {
  const scopes = new Set<DashboardWidgetSyncScope>();
  if (patch.titleStyle) scopes.add("title");
  if (patch.widgetStyle) scopes.add("widgetAppearance");
  if (patch.paletteId !== undefined || patch.paletteColors !== undefined) {
    scopes.add("palette");
  }
  if (
    patch.paletteOpacity !== undefined ||
    patch.seriesGradient !== undefined ||
    patch.depthVisual !== undefined ||
    patch.chartLabelShow !== undefined ||
    patch.tooltipShow !== undefined ||
    patch.chartLabelStyle !== undefined ||
    patch.chartTooltipStyle !== undefined ||
    patch.tableColorStyle !== undefined
  ) {
    scopes.add("palette");
  }
  if (patch.numberFormat) scopes.add("numberFormat");
  if (patch.defaultQueryLimit !== undefined) scopes.add("queryLimit");
  return scopes;
}

export function syncChartWidgetsForDashboardScopes(
  widgets: LayoutWidget[],
  scopes: ReadonlySet<DashboardWidgetSyncScope>,
): LayoutWidget[] {
  if (scopes.size === 0) return widgets;

  return widgets.map((widget) => {
    if (widget.type !== "chart" || !widget.chartConfig) return widget;
    let cfg = widget.chartConfig;

    if (scopes.has("title")) cfg = stripChartTitleOverrides(cfg);
    if (scopes.has("widgetAppearance")) cfg = stripChartWidgetAppearanceOverrides(cfg);
    if (scopes.has("palette")) cfg = stripChartPaletteOverrides(cfg);
    if (scopes.has("numberFormat")) cfg = stripChartLabelFormatOverrides(cfg);
    if (scopes.has("queryLimit")) cfg = stripChartQueryLimitOverride(cfg);

    return cfg === widget.chartConfig ? widget : { ...widget, chartConfig: cfg };
  });
}

export function stripChartWidgetAppearanceOverrides(cfg: ChartViewConfig): ChartViewConfig {
  const de = readChartDeStyle(cfg);
  if (!de.background && !de.border) return cfg;
  const nextDe: ChartDeStyle = { ...de };
  delete nextDe.background;
  delete nextDe.border;
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deStyle: nextDe,
    },
  };
}

export function stripChartPaletteOverrides(cfg: ChartViewConfig): ChartViewConfig {
  const de = readChartDeStyle(cfg);
  const features = cfg.nativeBody?.deFeatures;
  const hasShowLabelFeature =
    features && typeof features === "object" && "showLabel" in features;
  const label = de.label;
  const hasLabelPaletteFields =
    label &&
    (label.show !== undefined || label.fontSize !== undefined || label.color !== undefined);
  const tooltip = de.tooltip;
  const hasTooltipFields =
    tooltip &&
    (tooltip.show !== undefined ||
      tooltip.fontSize !== undefined ||
      tooltip.color !== undefined ||
      tooltip.background !== undefined);
  const hasPaletteFields =
    de.paletteId != null ||
    de.paletteOpacity != null ||
    de.seriesGradient != null ||
    de.depthVisual != null ||
    hasLabelPaletteFields ||
    hasTooltipFields ||
    hasShowLabelFeature;
  if (!hasPaletteFields) return cfg;

  const nextDe: ChartDeStyle = { ...de };
  delete nextDe.paletteId;
  delete nextDe.paletteOpacity;
  delete nextDe.seriesGradient;
  delete nextDe.depthVisual;

  if (label) {
    const nextLabel: ChartLabelStyle = { ...label };
    delete nextLabel.show;
    delete nextLabel.fontSize;
    delete nextLabel.color;
    const hasLabel =
      nextLabel.formatType !== undefined ||
      nextLabel.thousandSeparator !== undefined;
    if (hasLabel) nextDe.label = nextLabel;
    else delete nextDe.label;
  }

  if (tooltip) {
    delete nextDe.tooltip;
  }

  let nativeBody = {
    ...cfg.nativeBody,
    deStyle: nextDe,
  };

  if (hasShowLabelFeature && features && typeof features === "object") {
    const { showLabel: _removed, ...restFeatures } = features as { showLabel?: boolean };
    if (Object.keys(restFeatures).length > 0) {
      nativeBody = { ...nativeBody, deFeatures: restFeatures };
    } else {
      const { deFeatures: _drop, ...restBody } = nativeBody;
      nativeBody = restBody;
    }
  }

  return { ...cfg, nativeBody };
}

export function stripChartLabelFormatOverrides(cfg: ChartViewConfig): ChartViewConfig {
  const de = readChartDeStyle(cfg);
  const label = de.label;
  if (!label || (label.formatType == null && label.thousandSeparator === undefined)) {
    return cfg;
  }
  const nextLabel: ChartLabelStyle = { ...label };
  delete nextLabel.formatType;
  delete nextLabel.thousandSeparator;
  const hasLabel =
    nextLabel.show !== undefined ||
    nextLabel.fontSize !== undefined ||
    nextLabel.color !== undefined;
  const nextDe: ChartDeStyle = { ...de };
  if (hasLabel) nextDe.label = nextLabel;
  else delete nextDe.label;
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deStyle: nextDe,
    },
  };
}

export function stripChartQueryLimitOverride(cfg: ChartViewConfig): ChartViewConfig {
  const raw = cfg.nativeBody?.deDisplay;
  if (!raw || typeof raw !== "object") return cfg;
  const de = raw as { resultLimit?: string; refreshMode?: string };
  if (!de.resultLimit) return cfg;
  const { resultLimit: _removed, ...restDisplay } = de;
  const nativeBody = { ...cfg.nativeBody };
  if (Object.keys(restDisplay).length > 0) {
    nativeBody.deDisplay = restDisplay;
  } else {
    delete nativeBody.deDisplay;
  }
  return { ...cfg, nativeBody };
}

export function patchChartDeStyle(
  cfg: ChartViewConfig,
  patch: Partial<ChartDeStyle>,
): ChartViewConfig {
  const prev = readChartDeStyle(cfg);
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deStyle: { ...prev, ...patch },
    },
  };
}

export function patchChartDeStyleNested<
  K extends keyof ChartDeStyle,
>(cfg: ChartViewConfig, key: K, patch: Partial<NonNullable<ChartDeStyle[K]>>): ChartViewConfig {
  const prev = readChartDeStyle(cfg);
  const nested = { ...(prev[key] as object), ...patch };
  return patchChartDeStyle(cfg, { [key]: nested } as Partial<ChartDeStyle>);
}

export function readChartShowLabel(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "chartLabelShow">,
): boolean {
  const labelShow = readChartDeStyle(cfg).label?.show;
  if (labelShow !== undefined) return labelShow;
  const features = cfg.nativeBody?.deFeatures;
  if (features && typeof features === "object" && "showLabel" in features) {
    return Boolean((features as { showLabel?: boolean }).showLabel);
  }
  return defaults?.chartLabelShow ?? false;
}

export function readChartTooltipShow(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "tooltipShow">,
): boolean {
  const tooltipShow = readChartDeStyle(cfg).tooltip?.show;
  if (tooltipShow !== undefined) return tooltipShow;
  return defaults?.tooltipShow ?? true;
}

export function readChartSeriesGradient(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "seriesGradient">,
): boolean {
  const gradient = readChartDeStyle(cfg).seriesGradient;
  if (gradient !== undefined) return gradient;
  return defaults?.seriesGradient ?? false;
}

export function readChartDepthVisual(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "depthVisual">,
): "off" | "standard" | "enhanced" {
  const depth = readChartDeStyle(cfg).depthVisual;
  if (depth !== undefined) return depth;
  return defaults?.depthVisual ?? "off";
}

export function readChartPaletteOpacity(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "paletteOpacity">,
): number | undefined {
  const opacity = readChartDeStyle(cfg).paletteOpacity;
  if (opacity !== undefined) return opacity;
  return defaults?.paletteOpacity;
}

export function resolveChartLabelPresentation(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "chartLabelStyle">,
): { fontSize: number; color?: string } {
  const label = readChartDeStyle(cfg).label;
  return {
    fontSize: label?.fontSize ?? defaults?.chartLabelStyle?.fontSize ?? 12,
    color: label?.color ?? defaults?.chartLabelStyle?.color,
  };
}

export function resolveChartTooltipPresentation(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "chartTooltipStyle">,
): { fontSize: number; color?: string; background?: string } {
  const tooltip = readChartDeStyle(cfg).tooltip;
  return {
    fontSize: tooltip?.fontSize ?? defaults?.chartTooltipStyle?.fontSize ?? 12,
    color: tooltip?.color ?? defaults?.chartTooltipStyle?.color,
    background: tooltip?.background ?? defaults?.chartTooltipStyle?.background,
  };
}

/** 图表标签字体色：组件 → 看板 → 主题令牌（供取色器预览真实生效色） */
export function resolveChartLabelDisplayColor(
  cfg: ChartViewConfig | undefined,
  defaults?: Pick<DashboardStyleConfig, "chartLabelStyle" | "colorScheme">,
): string {
  const label = cfg ? readChartDeStyle(cfg).label : undefined;
  const scheme = defaults?.colorScheme ?? "light";
  return label?.color ?? defaults?.chartLabelStyle?.color ?? getDashboardThemeTokens(scheme).chartAxis;
}

/** 图表提示字体色：组件 → 看板 → ECharts 常见默认 */
export function resolveChartTooltipDisplayColor(
  cfg: ChartViewConfig | undefined,
  defaults?: Pick<DashboardStyleConfig, "chartTooltipStyle" | "colorScheme">,
): string {
  const tooltip = cfg ? readChartDeStyle(cfg).tooltip : undefined;
  return tooltip?.color ?? defaults?.chartTooltipStyle?.color ?? "#ffffff";
}

/** 图表提示背景色：组件 → 看板 → 主题近似默认 */
export function resolveChartTooltipDisplayBackground(
  cfg: ChartViewConfig | undefined,
  defaults?: Pick<DashboardStyleConfig, "chartTooltipStyle" | "colorScheme">,
): string {
  const tooltip = cfg ? readChartDeStyle(cfg).tooltip : undefined;
  const scheme = defaults?.colorScheme ?? "light";
  const tokens = getDashboardThemeTokens(scheme);
  return (
    tooltip?.background ??
    defaults?.chartTooltipStyle?.background ??
    (scheme === "dark" ? tokens.dialogBg : "#344054")
  );
}

export function readChartRemark(cfg: ChartViewConfig | undefined): { show: boolean; text: string } {
  if (!cfg) return { show: false, text: "" };
  const remark = readChartDeStyle(cfg).remark;
  const text = remark?.text?.trim() ?? "";
  return { show: Boolean(remark?.show && text), text };
}

export function readChartDataZoom(cfg: ChartViewConfig): boolean {
  const raw = cfg.nativeBody?.deFeatures;
  if (raw && typeof raw === "object" && "dataZoom" in raw) {
    return Boolean((raw as { dataZoom?: boolean }).dataZoom);
  }
  return false;
}

/** 组件内容区内背景/内边距/圆角（对标 DE 样式 Tab · 背景） */
export function widgetStyleToContentCss(
  bg: WidgetStyleConfig | undefined,
  colorScheme: ColorScheme = "light",
): WidgetBackgroundPresentation {
  return buildWidgetBackgroundPresentation(bg, colorScheme, { respectBackgroundShow: true });
}

/** 单图 deStyle 覆盖看板 widgetStyle，统一落到组件外框（pixel-shape-inner） */
export function mergeChartDeStyleIntoWidgetShell(
  global: WidgetStyleConfig | undefined,
  de: ChartDeStyle,
): WidgetStyleConfig {
  const merged: WidgetStyleConfig = { ...(global ?? {}) };
  const bg = de.background;
  if (bg && typeof bg === "object") {
    Object.assign(merged, bg);
  }
  if (de.border?.show) {
    merged.borderEnabled = true;
    if (de.border.color !== undefined) merged.borderColor = de.border.color;
    if (de.border.width !== undefined) merged.borderWidth = de.border.width;
    if (de.border.style !== undefined) merged.borderStyle = de.border.style;
    if (de.border.radius !== undefined) merged.borderRadius = de.border.radius;
  } else if (de.border?.show === false) {
    merged.borderEnabled = false;
  }
  return merged;
}

function widgetStyleAllowsDecorativeFrame(ws: WidgetStyleConfig | undefined): boolean {
  return ws?.backgroundMode === "frame" && Boolean(ws?.framePresetId);
}

/** 看板 widgetStyle 外壳 + 图表 deStyle 外观合并到同一外框层 */
export function resolveChartContentShellStyle(
  globalWidgetStyle: DashboardStyleConfig["widgetStyle"] | undefined,
  cfg: ChartViewConfig | undefined,
  colorScheme: ColorScheme = "light",
): {
  outer: ReturnType<typeof mergeWidgetShellStyle>;
  inner: CSSProperties;
  innerBackgroundLayer: CSSProperties | null;
  innerFrameLayer: CSSProperties | null;
} {
  const de = cfg ? readChartDeStyle(cfg) : {};
  const mergedWidgetStyle = cfg
    ? mergeChartDeStyleIntoWidgetShell(globalWidgetStyle, de)
    : globalWidgetStyle;
  const allowFrame = widgetStyleAllowsDecorativeFrame(mergedWidgetStyle);
  const outer = mergeWidgetShellStyle(mergedWidgetStyle, colorScheme, {
    allowDecorativeFrame: allowFrame,
  });
  return {
    outer,
    inner: {},
    innerBackgroundLayer: null,
    innerFrameLayer: null,
  };
}

export type ShapePresentationLayers = {
  style: CSSProperties;
  backgroundLayers: Array<CSSProperties | null>;
};

/** 外壳 widgetStyle + 单图 deStyle → shape-inner；shape-content 仅承载图表 */
export function mergeShapeInnerPresentation(shell: {
  outer: ReturnType<typeof mergeWidgetShellStyle>;
  inner: CSSProperties;
  innerBackgroundLayer: CSSProperties | null;
  innerFrameLayer?: CSSProperties | null;
}): { shell: ShapePresentationLayers; content: ShapePresentationLayers } {
  const shellStyle: CSSProperties = { ...shell.outer.style };
  const hasShellBackground = Boolean(
    shellStyle.background || shellStyle.backgroundColor || shellStyle.backgroundImage,
  );
  const usesBackdropGlass = Boolean(
    shell.outer.backgroundLayer?.backdropFilter ?? shell.outer.backgroundLayer?.WebkitBackdropFilter,
  );
  if (!hasShellBackground && !usesBackdropGlass) {
    shellStyle.backgroundColor = "var(--dashboard-widget-surface)";
  } else if (usesBackdropGlass && !hasShellBackground) {
    shellStyle.backgroundColor = "transparent";
  }

  return {
    shell: {
      style: shellStyle,
      backgroundLayers: [shell.outer.backgroundLayer, shell.outer.frameLayer ?? null],
    },
    content: {
      style: { ...shell.inner },
      backgroundLayers: [shell.innerBackgroundLayer, shell.innerFrameLayer ?? null],
    },
  };
}

export function resolveWidgetShellStyle(
  globalWidgetStyle: DashboardStyleConfig["widgetStyle"] | undefined,
  colorScheme: ColorScheme = "light",
): ReturnType<typeof mergeWidgetShellStyle> {
  return mergeWidgetShellStyle(globalWidgetStyle, colorScheme, {
    allowDecorativeFrame: widgetStyleAllowsDecorativeFrame(globalWidgetStyle),
  });
}

export function patchChartShowLabel(cfg: ChartViewConfig, show: boolean): ChartViewConfig {
  const withLabel = patchChartDeStyleNested(cfg, "label", { show });
  const prev = withLabel.nativeBody?.deFeatures;
  const deFeatures =
    prev && typeof prev === "object" ? { ...(prev as object), showLabel: show } : { showLabel: show };
  return { ...withLabel, nativeBody: { ...withLabel.nativeBody, deFeatures } };
}

/** 写入标签样式；设置字体颜色时若标签未开启则自动打开（对标 DataEase 选色即见效果） */
export function patchChartLabelStyle(
  cfg: ChartViewConfig,
  patch: Partial<ChartLabelStyle>,
  options?: { autoEnableShow?: boolean },
): ChartViewConfig {
  let next = patchChartDeStyleNested(cfg, "label", patch);
  const autoEnable = options?.autoEnableShow ?? true;
  if (autoEnable && patch.color !== undefined && !readChartShowLabel(next)) {
    next = patchChartShowLabel(next, true);
  }
  return next;
}

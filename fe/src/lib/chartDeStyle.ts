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

export type ChartLegendStyle = {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  fontSize?: number;
};

/** 看板内嵌图例默认：开启 + 底部 */
export const DEFAULT_CHART_LEGEND_STYLE: Required<Pick<ChartLegendStyle, "show" | "position">> &
  ChartLegendStyle = {
  show: true,
  position: "bottom",
};

export type ChartLabelStyle = {
  show?: boolean;
  fontSize?: number;
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
  roam?: boolean;
  showRegionLabel?: boolean;
  visualMap?: boolean;
  showCellLabel?: boolean;
};

/** 饼图/环形图样式（对标 DE attr-style · 基础样式） */
export type ChartPieStyle = {
  /** 环形内径，占容器短边百分比 */
  innerRadiusPercent?: number;
};

export const DEFAULT_PIE_INNER_RADIUS_PERCENT = 40;
export const DEFAULT_PIE_OUTER_RADIUS_PERCENT = 70;
export const PIE_INNER_RADIUS_MIN = 0;
export const PIE_INNER_RADIUS_MAX = 65;

export type ChartTooltipStyle = {
  show?: boolean;
};

export type ChartDeStyle = {
  paletteId?: string;
  paletteOpacity?: number;
  /** 系列渐变填充（对标 DE「渐变颜色」） */
  seriesGradient?: boolean;
  title?: TitleStyleConfig & { show?: boolean };
  legend?: ChartLegendStyle;
  label?: ChartLabelStyle;
  tooltip?: ChartTooltipStyle;
  background?: WidgetStyleConfig;
  border?: ChartBorderStyle;
  remark?: ChartRemarkStyle;
  geo?: ChartGeoStyle;
  pie?: ChartPieStyle;
};

export function readChartGeoStyle(deStyle: ChartDeStyle) {
  return deStyle.geo ?? {};
}

export function readChartPieStyle(deStyle: ChartDeStyle): ChartPieStyle {
  return deStyle.pie ?? {};
}

export function readChartDeStyle(cfg: ChartViewConfig): ChartDeStyle {
  const raw = cfg.nativeBody?.deStyle;
  if (!raw || typeof raw !== "object") return {};
  return raw as ChartDeStyle;
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
  if (de.paletteId == null && de.paletteOpacity == null) return cfg;
  const nextDe: ChartDeStyle = { ...de };
  delete nextDe.paletteId;
  delete nextDe.paletteOpacity;
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deStyle: nextDe,
    },
  };
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
    nextLabel.show !== undefined || nextLabel.fontSize !== undefined;
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
  const features = cfg.nativeBody?.deFeatures;
  if (features && typeof features === "object" && "showLabel" in features) {
    return Boolean((features as { showLabel?: boolean }).showLabel);
  }
  const labelShow = readChartDeStyle(cfg).label?.show;
  if (labelShow !== undefined) return labelShow;
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

export function readChartPaletteOpacity(
  cfg: ChartViewConfig,
  defaults?: Pick<DashboardStyleConfig, "paletteOpacity">,
): number | undefined {
  const opacity = readChartDeStyle(cfg).paletteOpacity;
  if (opacity !== undefined) return opacity;
  return defaults?.paletteOpacity;
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

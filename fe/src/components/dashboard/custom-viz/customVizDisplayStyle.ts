import { type ChartBorderStyle } from "@/lib/chartDeStyle";
import { resolveChartColors, resolvePaletteId } from "@/lib/chartPalette";
import type { DashboardStyleConfig, WidgetStyleConfig } from "../dashboardStyleConfig";
import type { CustomVizWidgetConfig, CustomVizDisplayStyle } from "../layoutUtils";
import { mergeWidgetOverrideStyle } from "../widgetRailStyleSections";

export type { CustomVizDisplayStyle };

export function readCustomVizDisplayStyle(
  config: CustomVizWidgetConfig | undefined,
): CustomVizDisplayStyle {
  return config?.displayStyle ?? {};
}

export function patchCustomVizDisplayStyle(
  config: CustomVizWidgetConfig,
  patch: Partial<CustomVizDisplayStyle>,
): CustomVizWidgetConfig {
  return {
    ...config,
    displayStyle: { ...(config.displayStyle ?? {}), ...patch },
  };
}

export function patchCustomVizDisplayStyleNested<
  K extends keyof CustomVizDisplayStyle,
>(
  config: CustomVizWidgetConfig,
  key: K,
  patch: Partial<NonNullable<CustomVizDisplayStyle[K]>>,
): CustomVizWidgetConfig {
  const prev = config.displayStyle ?? {};
  const nested = prev[key];
  return patchCustomVizDisplayStyle(config, {
    [key]: { ...(nested && typeof nested === "object" ? nested : {}), ...patch },
  } as Partial<CustomVizDisplayStyle>);
}

export function readCustomVizTitleVisible(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): boolean {
  const show = readCustomVizDisplayStyle(config).title?.show;
  if (show !== undefined) return show;
  return dashboardStyle?.titleStyle?.show !== false;
}

export function readCustomVizLabelVisible(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): boolean {
  const show = readCustomVizDisplayStyle(config).label?.show;
  if (show !== undefined) return show;
  return dashboardStyle?.chartLabelShow !== false;
}

export function readCustomVizTooltipVisible(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): boolean {
  const show = readCustomVizDisplayStyle(config).tooltip?.show;
  if (show !== undefined) return show;
  return dashboardStyle?.tooltipShow !== false;
}

export function resolveCustomVizLabelColor(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): string | undefined {
  return (
    readCustomVizDisplayStyle(config).label?.color ??
    dashboardStyle?.chartLabelStyle?.color
  );
}

export function resolveCustomVizTooltipColor(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): string | undefined {
  return (
    readCustomVizDisplayStyle(config).tooltip?.color ??
    dashboardStyle?.chartTooltipStyle?.color
  );
}

export function resolveCustomVizTooltipBackground(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): string | undefined {
  return (
    readCustomVizDisplayStyle(config).tooltip?.background ??
    dashboardStyle?.chartTooltipStyle?.background
  );
}

export function resolveCustomVizEffectivePaletteId(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): string | undefined {
  const own = readCustomVizDisplayStyle(config).paletteId;
  if (own != null) return resolvePaletteId(own);
  if (dashboardStyle?.paletteId != null) return resolvePaletteId(dashboardStyle.paletteId);
  return undefined;
}

export function resolveCustomVizEffectivePaletteColors(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): string[] {
  const ds = readCustomVizDisplayStyle(config);
  if (ds.paletteId != null) {
    return resolveChartColors(resolvePaletteId(ds.paletteId), ds.paletteColors);
  }
  if (ds.paletteColors?.length) return [...ds.paletteColors];
  return resolveChartColors(
    dashboardStyle?.paletteId,
    dashboardStyle?.paletteColors?.length ? [...dashboardStyle.paletteColors] : undefined,
  );
}

/** 样式 Tab「背景」：看板 + 单卡外壳 + display 内层 */
export function resolveCustomVizDisplayBackgroundShell(
  widget: { customVizConfig?: CustomVizWidgetConfig },
  dashboardStyle?: DashboardStyleConfig,
): WidgetStyleConfig {
  const global = dashboardStyle?.widgetStyle;
  const perWidget = mergeWidgetOverrideStyle(global, {
    id: "",
    type: "customViz",
    title: "",
    order: 0,
    colSpan: 1,
    rowSpan: 1,
    customVizConfig: widget.customVizConfig,
  });
  const inner = readCustomVizDisplayStyle(widget.customVizConfig).background ?? {};
  return { ...(perWidget ?? {}), ...inner };
}

export function readCustomVizDisplayBorder(
  config: CustomVizWidgetConfig | undefined,
  dashboardStyle?: DashboardStyleConfig,
): ChartBorderStyle {
  const merged = resolveCustomVizDisplayBackgroundShell(
    { customVizConfig: config },
    dashboardStyle,
  );
  const border = readCustomVizDisplayStyle(config).border;
  return {
    show: border?.show ?? merged.borderEnabled,
    color: border?.color ?? merged.borderColor,
    width: border?.width ?? merged.borderWidth,
    style: border?.style ?? merged.borderStyle,
    radius: border?.radius ?? merged.borderRadius,
  };
}

/** 合并 manifest / display / schema 写入 payload.style 与 --vs-style-* */
export function resolveCustomVizRuntimeStyle(args: {
  manifestDefault?: Record<string, unknown>;
  config?: CustomVizWidgetConfig;
}): Record<string, unknown> {
  const manifestDefault = args.manifestDefault ?? {};
  const schemaStyle = args.config?.style ?? {};
  const flatDisplay = flattenCustomVizDisplayStyle(args.config?.displayStyle);
  return { ...manifestDefault, ...flatDisplay, ...schemaStyle };
}

function flattenCustomVizDisplayStyle(
  displayStyle: CustomVizDisplayStyle | undefined,
): Record<string, unknown> {
  if (!displayStyle) return {};
  const out: Record<string, unknown> = {};
  const { title, remark, label, tooltip, paletteId, paletteColors, paletteOpacity, seriesGradient } =
    displayStyle;

  if (paletteId != null) out.paletteId = paletteId;
  if (paletteColors?.length) out.paletteColors = paletteColors;
  if (paletteOpacity != null) out.paletteOpacity = paletteOpacity;
  if (seriesGradient != null) out.seriesGradient = seriesGradient;

  if (title) {
    if (title.show != null) out.titleShow = title.show;
    if (title.color) out.titleColor = title.color;
    if (title.fontSize != null) out.titleFontSize = title.fontSize;
    if (title.fontWeight != null) out.titleFontWeight = title.fontWeight;
    if (title.fontStyle) out.titleFontStyle = title.fontStyle;
    if (title.align) out.titleAlign = title.align;
    if (title.letterSpacing != null) out.titleLetterSpacing = title.letterSpacing;
    if (title.shadow != null) out.titleShadow = title.shadow;
  }
  if (remark) {
    if (remark.show != null) out.remarkShow = remark.show;
    if (remark.text) out.remarkText = remark.text;
  }
  if (label) {
    if (label.show != null) out.labelShow = label.show;
    if (label.color) out.labelColor = label.color;
    if (label.fontSize != null) out.labelFontSize = label.fontSize;
    if (label.position) out.labelPosition = label.position;
    if (label.formatter) out.labelFormatter = label.formatter;
  }
  if (tooltip) {
    if (tooltip.show != null) out.tooltipShow = tooltip.show;
    if (tooltip.color) out.tooltipColor = tooltip.color;
    if (tooltip.background) out.tooltipBackground = tooltip.background;
    if (tooltip.fontSize != null) out.tooltipFontSize = tooltip.fontSize;
  }

  return out;
}

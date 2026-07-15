import type { CSSProperties } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type {
  DashboardStyleConfig,
  NumberFormatConfig,
  TitleStyleConfig,
  WidgetStyleConfig,
  ColorScheme,
} from "@/components/dashboard/dashboardStyleConfig";
import {
  coerceWidgetSurfaceBackground,
  mergeTitleStyle,
  mergeWidgetShellStyle,
  resolveBoxPadding,
  resolveBoxRadius,
} from "@/components/dashboard/dashboardStyleConfig";
import { getDashboardThemeTokens, isOppositeThemeTitleColor } from "@/components/dashboard/dashboardThemeTokens";

export type ChartLegendStyle = {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  fontSize?: number;
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
  roam?: boolean;
  showRegionLabel?: boolean;
  visualMap?: boolean;
};

export type ChartDeStyle = {
  paletteId?: string;
  paletteOpacity?: number;
  title?: TitleStyleConfig & { show?: boolean };
  legend?: ChartLegendStyle;
  label?: ChartLabelStyle;
  background?: WidgetStyleConfig;
  border?: ChartBorderStyle;
  remark?: ChartRemarkStyle;
  geo?: ChartGeoStyle;
};

export function readChartGeoStyle(deStyle: ChartDeStyle) {
  return deStyle.geo ?? {};
}

export function readChartDeStyle(cfg: ChartViewConfig): ChartDeStyle {
  const raw = cfg.nativeBody?.deStyle;
  if (!raw || typeof raw !== "object") return {};
  return raw as ChartDeStyle;
}

/** 默认显示；仅 deStyle.title.show === false 时隐藏 */
export function readChartTitleVisible(cfg: ChartViewConfig | undefined): boolean {
  if (!cfg) return true;
  return readChartDeStyle(cfg).title?.show !== false;
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
  return mergeTitleStyle(global, mergedOverride ?? { color: tokens.title });
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

export function readChartShowLabel(cfg: ChartViewConfig): boolean {
  const features = cfg.nativeBody?.deFeatures;
  if (features && typeof features === "object" && "showLabel" in features) {
    return Boolean((features as { showLabel?: boolean }).showLabel);
  }
  return readChartDeStyle(cfg).label?.show ?? false;
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
): CSSProperties {
  if (!bg) return {};
  const style: CSSProperties = {};
  const coerced = coerceWidgetSurfaceBackground(bg.background, colorScheme);
  if (coerced) style.background = coerced;
  if (bg.backgroundImage) {
    style.backgroundImage = `url(${bg.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (bg.opacity != null) style.opacity = bg.opacity;
  if (bg.backdropBlur != null && bg.backdropBlur > 0) {
    style.backdropFilter = `blur(${bg.backdropBlur}px)`;
  }
  const padding = resolveBoxPadding(bg);
  if (padding) style.padding = padding;
  const radius = resolveBoxRadius(bg);
  if (radius) style.borderRadius = radius;
  return style;
}

/** 看板 widgetStyle 外壳 + 图表 deStyle 内区（背景/内边距/边框） */
export function resolveChartContentShellStyle(
  globalWidgetStyle: DashboardStyleConfig["widgetStyle"] | undefined,
  cfg: ChartViewConfig | undefined,
  colorScheme: ColorScheme = "light",
): { outer: ReturnType<typeof mergeWidgetShellStyle>; inner: CSSProperties } {
  const outer = mergeWidgetShellStyle(globalWidgetStyle, colorScheme);
  if (!cfg) return { outer, inner: {} };
  const de = readChartDeStyle(cfg);
  const inner = widgetStyleToContentCss(de.background, colorScheme);
  if (de.border?.show) {
    inner.borderStyle = de.border.style ?? "solid";
    inner.borderColor = de.border.color ?? "var(--dashboard-widget-border, var(--color-gray-200))";
    inner.borderWidth = de.border.width ?? 1;
    if (de.border.radius != null) inner.borderRadius = `${de.border.radius}px`;
  }
  return { outer, inner };
}

export function resolveWidgetShellStyle(
  globalWidgetStyle: DashboardStyleConfig["widgetStyle"] | undefined,
  colorScheme: ColorScheme = "light",
): ReturnType<typeof mergeWidgetShellStyle> {
  return mergeWidgetShellStyle(globalWidgetStyle, colorScheme);
}

export function patchChartShowLabel(cfg: ChartViewConfig, show: boolean): ChartViewConfig {
  const withLabel = patchChartDeStyleNested(cfg, "label", { show });
  const prev = withLabel.nativeBody?.deFeatures;
  const deFeatures =
    prev && typeof prev === "object" ? { ...(prev as object), showLabel: show } : { showLabel: show };
  return { ...withLabel, nativeBody: { ...withLabel.nativeBody, deFeatures } };
}

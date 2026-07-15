import type {
  ColorScheme,
  DashboardStyleConfig,
  DialogStyleConfig,
  FilterChromeStyleConfig,
  TitleStyleConfig,
  WidgetStyleConfig,
} from "./dashboardStyleConfig";
import { CANVAS_BG_DARK_DEFAULT, CANVAS_BG_LIGHT_DEFAULT, isDarkCanvasColor, isDarkWidgetShellColor, isLightCanvasColor, resolveCanvasDecorPresetId, WIDGET_SHELL_DARK_DEFAULT } from "./dashboardStyleConfig";
import type { LayoutWidget } from "./layoutUtils";
import { getDashboardThemeTokens, isOppositeThemeTitleColor } from "./dashboardThemeTokens";
import { patchChartDeStyleNested, readChartDeStyle } from "@/lib/chartDeStyle";

/** 随浅色/深色分别保存的视觉字段（结构类如圆角/间隙不在此列） */
export type ThemeVariantFields = {
  canvasBackground?: string;
  canvasBackgroundImage?: string;
  themeAccent?: string;
  widgetStyle?: Pick<WidgetStyleConfig, "background" | "borderColor" | "opacity">;
  titleStyle?: Pick<TitleStyleConfig, "color">;
  dialogStyle?: DialogStyleConfig;
  filterChromeStyle?: Pick<FilterChromeStyleConfig, "titleColor">;
};

export type DashboardThemeVariants = Partial<Record<ColorScheme, ThemeVariantFields>>;

const THEME_ROOT_KEYS = new Set([
  "canvasBackground",
  "canvasBackgroundImage",
  "themeAccent",
  "widgetStyle",
  "titleStyle",
  "dialogStyle",
  "filterChromeStyle",
]);

export function defaultThemeVariant(scheme: ColorScheme): ThemeVariantFields {
  const tokens = getDashboardThemeTokens(scheme);
  if (scheme === "dark") {
    return {
      canvasBackground: tokens.canvas,
      canvasBackgroundImage: undefined,
      themeAccent: "#7090ff",
      widgetStyle: {
        background: tokens.widgetShell,
        borderColor: tokens.widgetBorder,
      },
      titleStyle: { color: tokens.title },
      dialogStyle: { background: tokens.dialogBg, fontColor: tokens.dialogFg },
      filterChromeStyle: { titleColor: tokens.filterTitle },
    };
  }
  return {
    canvasBackground: tokens.canvas,
    canvasBackgroundImage: undefined,
    themeAccent: "#465fff",
    widgetStyle: {
      background: tokens.widgetShell,
      borderColor: tokens.widgetBorder,
    },
    titleStyle: { color: tokens.title },
    dialogStyle: { background: tokens.dialogBg, fontColor: tokens.dialogFg },
    filterChromeStyle: { titleColor: tokens.filterTitle },
  };
}

export function extractThemeVariant(config: DashboardStyleConfig): ThemeVariantFields {
  const ws = config.widgetStyle;
  return {
    canvasBackground: config.canvasBackground,
    canvasBackgroundImage: config.canvasBackgroundImage,
    themeAccent: config.themeAccent,
    widgetStyle: ws
      ? {
          background: ws.background,
          borderColor: ws.borderColor,
          opacity: ws.opacity,
        }
      : undefined,
    titleStyle: config.titleStyle?.color ? { color: config.titleStyle.color } : undefined,
    dialogStyle: config.dialogStyle ? { ...config.dialogStyle } : undefined,
    filterChromeStyle: config.filterChromeStyle?.titleColor
      ? { titleColor: config.filterChromeStyle.titleColor }
      : undefined,
  };
}

function mergeThemeVariantIntoConfig(
  config: DashboardStyleConfig,
  variant: ThemeVariantFields,
): DashboardStyleConfig {
  return {
    ...config,
    canvasBackground: variant.canvasBackground,
    canvasBackgroundImage: variant.canvasBackgroundImage,
    themeAccent: variant.themeAccent,
    widgetStyle: {
      ...config.widgetStyle,
      ...variant.widgetStyle,
    },
    titleStyle: {
      ...config.titleStyle,
      ...variant.titleStyle,
    },
    dialogStyle: variant.dialogStyle
      ? { ...config.dialogStyle, ...variant.dialogStyle }
      : config.dialogStyle,
    filterChromeStyle: {
      ...config.filterChromeStyle,
      ...variant.filterChromeStyle,
    },
  };
}

function canvasNeedsSchemeReset(config: DashboardStyleConfig, scheme: ColorScheme): boolean {
  const bg = config.canvasBackground?.trim();
  if (scheme === "dark") {
    if (!bg) return true;
    return !isDarkCanvasColor(bg);
  }
  if (!bg) return false;
  return isDarkCanvasColor(bg);
}

function decorNeedsSchemeReset(config: DashboardStyleConfig, scheme: ColorScheme): boolean {
  if (!config.canvasBackgroundImage?.trim()) return false;
  const presetId = resolveCanvasDecorPresetId(config);
  if (scheme === "dark") return presetId !== "none" && presetId !== "custom";
  return false;
}

function sanitizeThemeVariant(
  variant: ThemeVariantFields,
  scheme: ColorScheme,
): ThemeVariantFields {
  const defaults = defaultThemeVariant(scheme);
  if (scheme === "dark") {
    const bg = variant.canvasBackground?.trim();
    if (!bg || isLightCanvasColor(bg) || variant.canvasBackgroundImage) {
      return { ...defaults, ...variant, ...defaults, canvasBackgroundImage: undefined };
    }
    const wbg = variant.widgetStyle?.background?.trim();
    if (!wbg || !isDarkWidgetShellColor(wbg)) {
      return {
        ...variant,
        widgetStyle: { ...variant.widgetStyle, ...defaults.widgetStyle },
      };
    }
  }
  return variant;
}

/** 固定主题令牌：标题/弹窗/筛选标题等整体字色随 colorScheme 同步 */
function applyFixedThemeTypography(config: DashboardStyleConfig): DashboardStyleConfig {
  const scheme = config.colorScheme ?? "light";
  const tokens = getDashboardThemeTokens(scheme);
  return {
    ...config,
    titleStyle: { ...config.titleStyle, color: tokens.title },
    filterChromeStyle: { ...config.filterChromeStyle, titleColor: tokens.filterTitle },
    dialogStyle: {
      ...config.dialogStyle,
      background: tokens.dialogBg,
      fontColor: tokens.dialogFg,
    },
  };
}

/** 加载/切换后纠正与 colorScheme 冲突的浅色渐变、装饰与组件白底 */
export function normalizeStyleConfigForColorScheme(
  config: DashboardStyleConfig,
): DashboardStyleConfig {
  const scheme = config.colorScheme ?? "light";
  const defaults = defaultThemeVariant(scheme);
  const patch: Partial<DashboardStyleConfig> = {};

  if (canvasNeedsSchemeReset(config, scheme) || decorNeedsSchemeReset(config, scheme)) {
    patch.canvasBackground = defaults.canvasBackground;
    patch.canvasBackgroundImage = undefined;
  }

  const wbg = config.widgetStyle?.background?.trim();
  if (scheme === "dark" && (!wbg || !isDarkWidgetShellColor(wbg))) {
    patch.widgetStyle = {
      ...config.widgetStyle,
      background: defaults.widgetStyle?.background,
      borderColor: defaults.widgetStyle?.borderColor,
    };
  }
  if (scheme === "light" && wbg && isDarkWidgetShellColor(wbg)) {
    patch.widgetStyle = {
      ...config.widgetStyle,
      background: defaults.widgetStyle?.background,
      borderColor: defaults.widgetStyle?.borderColor,
    };
  }

  const merged = applyFixedThemeTypography({ ...config, ...patch });
  const unchanged =
    Object.keys(patch).length === 0 &&
    merged.titleStyle?.color === config.titleStyle?.color &&
    merged.filterChromeStyle?.titleColor === config.filterChromeStyle?.titleColor &&
    merged.dialogStyle?.background === config.dialogStyle?.background &&
    merged.dialogStyle?.fontColor === config.dialogStyle?.fontColor;

  if (unchanged) return config;

  return {
    ...merged,
    themeVariants: {
      ...merged.themeVariants,
      [scheme]: extractThemeVariant(merged),
    },
  };
}

function patchTouchesThemeFields(patch: Partial<DashboardStyleConfig>): boolean {
  return Object.keys(patch).some((key) => THEME_ROOT_KEYS.has(key));
}

/** 细化配置写入时同步当前主题的 variant 快照 */
export function patchDashboardStyle(
  config: DashboardStyleConfig,
  patch: Partial<DashboardStyleConfig>,
): DashboardStyleConfig {
  const merged: DashboardStyleConfig = { ...config, ...patch };
  if (patch.colorScheme != null && patch.colorScheme !== (config.colorScheme ?? "light")) {
    const withVariants = patchTouchesThemeFields(patch)
      ? {
          ...merged,
          themeVariants: {
            ...merged.themeVariants,
            [merged.colorScheme ?? "light"]: extractThemeVariant(merged),
          },
        }
      : merged;
    return normalizeStyleConfigForColorScheme(withVariants);
  }
  if (!patchTouchesThemeFields(patch)) return merged;
  const scheme = merged.colorScheme ?? "light";
  return {
    ...merged,
    themeVariants: {
      ...merged.themeVariants,
      [scheme]: extractThemeVariant(merged),
    },
  };
}

/** 仪表板风格：切换浅色/深色并加载对应 variant（无则套默认预设） */
export function switchDashboardColorScheme(
  config: DashboardStyleConfig,
  nextScheme: ColorScheme,
): DashboardStyleConfig {
  const prevScheme = config.colorScheme ?? "light";
  if (prevScheme === nextScheme) return normalizeStyleConfigForColorScheme(config);

  const variants: DashboardThemeVariants = {
    ...config.themeVariants,
    [prevScheme]: extractThemeVariant(config),
  };
  const loaded = sanitizeThemeVariant(
    variants[nextScheme] ?? defaultThemeVariant(nextScheme),
    nextScheme,
  );
  const merged = mergeThemeVariantIntoConfig(
    { ...config, colorScheme: nextScheme, themeVariants: variants },
    loaded,
  );
  return normalizeStyleConfigForColorScheme({
    ...merged,
    themeVariants: {
      ...variants,
      [nextScheme]: extractThemeVariant(
        normalizeStyleConfigForColorScheme(merged),
      ),
    },
  });
}

/** 切换主题时同步各图表 deStyle 内区背景与标题字色 */
export function syncChartWidgetsForColorScheme(
  widgets: LayoutWidget[],
  scheme: ColorScheme,
): LayoutWidget[] {
  const tokens = getDashboardThemeTokens(scheme);
  return widgets.map((widget) => {
    if (widget.type !== "chart" || !widget.chartConfig) return widget;
    let chartConfig = widget.chartConfig;
    const de = readChartDeStyle(chartConfig);
    const bg = de.background?.background?.trim();
    const titleColor = de.title?.color?.trim();

    if (bg) {
      const shellOk =
        scheme === "dark" ? isDarkWidgetShellColor(bg) : !isDarkWidgetShellColor(bg);
      if (!shellOk) {
        chartConfig = patchChartDeStyleNested(chartConfig, "background", {
          background: tokens.widgetShell,
        });
      }
    }

    if (
      !titleColor ||
      isOppositeThemeTitleColor(titleColor, scheme) ||
      titleColor.toLowerCase() === (scheme === "dark" ? "#1d2939" : "#f2f4f7")
    ) {
      chartConfig = patchChartDeStyleNested(chartConfig, "title", {
        color: tokens.title,
      });
    }

    return chartConfig === widget.chartConfig
      ? widget
      : { ...widget, chartConfig };
  });
}

/** 仪表板风格切换：全局 styleConfig + 全部图表组件背景一并初始化 */
export function switchDashboardThemeBundle(
  styleConfig: DashboardStyleConfig,
  widgets: LayoutWidget[],
  nextScheme: ColorScheme,
): { styleConfig: DashboardStyleConfig; widgets: LayoutWidget[] } {
  const nextStyle = switchDashboardColorScheme(styleConfig, nextScheme);
  return {
    styleConfig: nextStyle,
    widgets: syncChartWidgetsForColorScheme(widgets, nextScheme),
  };
}

export function resetActiveThemePreset(config: DashboardStyleConfig): DashboardStyleConfig {
  const scheme = config.colorScheme ?? "light";
  const preset = defaultThemeVariant(scheme);
  return patchDashboardStyle(mergeThemeVariantIntoConfig(config, preset), {});
}

export function initializeDualThemePresets(config: DashboardStyleConfig): DashboardStyleConfig {
  const light = defaultThemeVariant("light");
  const dark = defaultThemeVariant("dark");
  const scheme = config.colorScheme ?? "light";
  const active = scheme === "dark" ? dark : light;
  const merged = mergeThemeVariantIntoConfig(config, active);
  return {
    ...merged,
    colorScheme: scheme,
    themeVariants: { light, dark },
  };
}

import type { CSSProperties } from "react";
import { hexToRgb, normalizeHexColor } from "@/components/ui/color-utils";

function readOpacity(value: CSSProperties["opacity"]): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/** 将纯色/变量背景转为带 alpha 的色值，不影响子元素 */
export function withBackgroundAlpha(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  if (clamped >= 1) return color;
  if (clamped <= 0) return "transparent";

  const trimmed = color.trim();
  const hex = normalizeHexColor(trimmed);
  if (hex) {
    const rgb = hexToRgb(hex);
    if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamped})`;
    }
  }

  const pct = Math.round(clamped * 100);
  return `color-mix(in srgb, ${trimmed} ${pct}%, transparent)`;
}

export function needsWidgetBackgroundLayer(style: CSSProperties): boolean {
  const opacity = readOpacity(style.opacity);
  if (opacity == null || opacity >= 1) return false;
  return Boolean(style.backgroundImage || style.backdropFilter);
}

export type WidgetBackgroundPresentation = {
  surface: CSSProperties;
  backgroundLayer: CSSProperties | null;
};

/**
 * 背景不透明度只作用于底色/底图，不污染文字与图线（禁止容器 opacity）。
 */
export function applyBackgroundOpacityOnly(
  style: CSSProperties,
  fallbackBg = "var(--dashboard-widget-surface)",
): WidgetBackgroundPresentation {
  const opacity = readOpacity(style.opacity);
  const surface = { ...style };
  delete surface.opacity;

  if (opacity == null || opacity >= 1) {
    return { surface, backgroundLayer: null };
  }

  if (needsWidgetBackgroundLayer(style)) {
    delete surface.background;
    delete surface.backgroundColor;
    delete surface.backgroundImage;
    delete surface.backgroundSize;
    delete surface.backgroundPosition;
    delete surface.backdropFilter;
    return {
      surface,
      backgroundLayer: {
        opacity,
        background: style.background,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backdropFilter: style.backdropFilter,
        borderRadius: style.borderRadius,
      },
    };
  }

  const base =
    (typeof style.background === "string" && style.background) ||
    (typeof style.backgroundColor === "string" && style.backgroundColor) ||
    fallbackBg;

  delete surface.background;
  delete surface.backgroundColor;
  surface.backgroundColor = withBackgroundAlpha(base, opacity);

  return { surface, backgroundLayer: null };
}

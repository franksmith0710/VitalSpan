import type { CSSProperties } from "react";
import type { ColorScheme, WidgetStyleConfig } from "@/components/dashboard/dashboardStyleConfig";
import {
  coerceWidgetSurfaceBackground,
  isThemeDefaultShellBackground,
  resolveBoxPadding,
  resolveBoxRadius,
} from "@/components/dashboard/dashboardStyleConfig";
import { resolveChartFrameOverlayLayer } from "@/lib/chartFrameBorderPresets";
import {
  applyBackgroundOpacityOnly,
  buildWidgetBackdropBlurStyle,
  buildWidgetImageBlurStyle,
  type WidgetBackgroundPresentation,
} from "@/lib/widgetSurfaceBackground";

/** 组件/全局 widgetStyle → 背景色、底图、装饰边框图层（对标 DE 背景区） */
export function buildWidgetBackgroundPresentation(
  bg: WidgetStyleConfig | undefined,
  colorScheme: ColorScheme = "light",
  options?: {
    respectBackgroundShow?: boolean;
    applyThemeDefaultSurface?: boolean;
    /** 看板全局 widgetStyle 为 false；单图 deStyle.background 为 true */
    allowDecorativeFrame?: boolean;
  },
): WidgetBackgroundPresentation {
  if (!bg) return { surface: {}, backgroundLayer: null, frameLayer: null };

  const respectShow = options?.respectBackgroundShow !== false;
  const showBackground = !respectShow || bg.backgroundShow !== false;
  const style: CSSProperties = {};
  const radius = resolveBoxRadius(bg);
  let frameLayer: CSSProperties | null = null;
  let imageLayer: CSSProperties | null = null;

  const coerced = coerceWidgetSurfaceBackground(bg.background, colorScheme);
  const useThemeDefault =
    options?.applyThemeDefaultSurface === true &&
    isThemeDefaultShellBackground(bg.background, colorScheme);

  if (useThemeDefault) {
    style.backgroundColor = "var(--dashboard-widget-surface)";
  } else if (coerced) {
    style.background = coerced;
  } else {
    style.backgroundColor = "var(--dashboard-widget-surface)";
  }

  if (showBackground) {
    const mode = bg.backgroundMode ?? (bg.framePresetId ? "frame" : "image");
    const allowFrame = options?.allowDecorativeFrame !== false;
    if (allowFrame && mode === "frame" && bg.framePresetId) {
      frameLayer = resolveChartFrameOverlayLayer(bg.framePresetId, bg.frameColor, radius);
    } else if (mode !== "border" && bg.backgroundImage) {
      const imageUrl = `url(${bg.backgroundImage})`;
      const blurPx = bg.backdropBlur ?? 0;
      imageLayer = {
        backgroundImage: imageUrl,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: radius,
        ...(blurPx > 0 ? buildWidgetImageBlurStyle(blurPx) : {}),
      };
    }
    if (bg.opacity != null) style.opacity = bg.opacity;
    const blurPx = bg.backdropBlur ?? 0;
    if (blurPx > 0 && !bg.backgroundImage) {
      Object.assign(style, buildWidgetBackdropBlurStyle(blurPx));
    }
  }

  const padding = resolveBoxPadding(bg);
  if (padding) style.padding = padding;
  if (radius) style.borderRadius = radius;

  const presentation = applyBackgroundOpacityOnly(style);
  if (imageLayer) {
    if (presentation.backgroundLayer) {
      presentation.backgroundLayer = { ...presentation.backgroundLayer, ...imageLayer };
    } else if (bg.opacity != null && bg.opacity < 1) {
      presentation.backgroundLayer = { opacity: bg.opacity, ...imageLayer };
    } else {
      presentation.backgroundLayer = imageLayer;
    }
  }
  if (frameLayer) {
    const frameAlpha = bg.frameOpacity ?? bg.opacity;
    if (frameAlpha != null && frameAlpha < 1) {
      frameLayer = { ...frameLayer, opacity: frameAlpha };
    }
  }
  presentation.frameLayer = frameLayer;
  return presentation;
}

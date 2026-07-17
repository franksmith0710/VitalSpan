import type { DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";
import type { DashboardStyleConfig } from "@/components/dashboard/dashboardStyleConfig";
import { PIXEL_CANVAS_MIN_HEIGHT } from "@/components/dashboard/pixelCanvas/PixelCanvas";

export type SurfaceKind = "dashboard" | "data-screen";

export type SurfacePreset = {
  kind: SurfaceKind;
  canvas: { width: number; height: number };
  defaultStyle: Partial<DashboardStyleConfig>;
};

const DASHBOARD_PRESET: SurfacePreset = {
  kind: "dashboard",
  canvas: { width: 1440, height: PIXEL_CANVAS_MIN_HEIGHT },
  defaultStyle: {
    surfaceKind: "dashboard",
    colorScheme: "light",
    scaleMode: "canvas",
  },
};

const DATA_SCREEN_PRESET: SurfacePreset = {
  kind: "data-screen",
  canvas: { width: 1920, height: 1080 },
  defaultStyle: {
    surfaceKind: "data-screen",
    colorScheme: "dark",
    canvasBackground: "#0b1220",
    canvasBackgroundCustom: true,
    scaleMode: "canvas",
    gapPreset: "none",
    widgetGap: 0,
    pixelGutter: 0,
    themeAccent: "#3b82f6",
  },
};

export function getSurfacePreset(kind: SurfaceKind): SurfacePreset {
  return kind === "data-screen" ? DATA_SCREEN_PRESET : DASHBOARD_PRESET;
}

export function buildDefaultLayoutForSurface(kind: SurfaceKind): DashboardLayoutV2 {
  const preset = getSurfacePreset(kind);
  return {
    version: 2,
    canvas: { ...preset.canvas },
    widgets: [],
    globalFilters: [],
    styleConfig: { ...preset.defaultStyle },
  };
}

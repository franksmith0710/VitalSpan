import type { CSSProperties } from "react";
import type { WidgetStyleConfig } from "@/components/dashboard/dashboardStyleConfig";

export type WidgetBackgroundImageFit =
  | "stretch"
  | "contain"
  | "cover"
  | "widthFit"
  | "heightFit"
  | "original";

export type WidgetBackgroundImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top left"
  | "top center"
  | "top right"
  | "center left"
  | "center right"
  | "bottom left"
  | "bottom center"
  | "bottom right";

export const WIDGET_BACKGROUND_IMAGE_FIT_OPTIONS: {
  value: WidgetBackgroundImageFit;
  label: string;
}[] = [
  { value: "stretch", label: "拉伸" },
  { value: "widthFit", label: "按宽等比" },
  { value: "heightFit", label: "按高等比" },
  { value: "contain", label: "适应" },
  { value: "cover", label: "覆盖" },
  { value: "original", label: "原始" },
];

export const WIDGET_BACKGROUND_IMAGE_POSITION_OPTIONS: {
  value: WidgetBackgroundImagePosition;
  label: string;
}[] = [
  { value: "top left", label: "左上" },
  { value: "top center", label: "上" },
  { value: "top right", label: "右上" },
  { value: "center left", label: "左" },
  { value: "center", label: "中" },
  { value: "center right", label: "右" },
  { value: "bottom left", label: "左下" },
  { value: "bottom center", label: "下" },
  { value: "bottom right", label: "右下" },
];

const FITS_WITH_POSITION: WidgetBackgroundImageFit[] = [
  "widthFit",
  "heightFit",
  "contain",
  "cover",
  "original",
];

export function backgroundImageFitSupportsPosition(
  fit: WidgetBackgroundImageFit | undefined,
): boolean {
  const resolved = fit ?? "stretch";
  return FITS_WITH_POSITION.includes(resolved);
}

function resolveBackgroundSize(fit: WidgetBackgroundImageFit | undefined): string {
  switch (fit ?? "stretch") {
    case "contain":
      return "contain";
    case "cover":
      return "cover";
    case "widthFit":
      return "100% auto";
    case "heightFit":
      return "auto 100%";
    case "original":
      return "auto";
    case "stretch":
    default:
      return "100% 100%";
  }
}

function defaultPositionForFit(fit: WidgetBackgroundImageFit | undefined): string {
  switch (fit ?? "stretch") {
    case "widthFit":
      return "center top";
    case "heightFit":
      return "left center";
    case "stretch":
      return "center";
    default:
      return "center";
  }
}

/** 内置顶栏/无边框装饰图：按宽等比 + 顶对齐（对标 DE） */
export function inferDefaultBackgroundImageFitForUrl(url: string): {
  backgroundImageFit: WidgetBackgroundImageFit;
  backgroundImagePosition: WidgetBackgroundImagePosition;
} | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.includes("/borderless-decor-v1/") ||
    trimmed.includes("/screen-headers/")
  ) {
    return {
      backgroundImageFit: "widthFit",
      backgroundImagePosition: "top center",
    };
  }
  return null;
}

export function resolveWidgetBackgroundImageLayerStyle(
  bg: Pick<WidgetStyleConfig, "backgroundImageFit" | "backgroundImagePosition">,
): Pick<CSSProperties, "backgroundSize" | "backgroundPosition" | "backgroundRepeat"> {
  const fit = bg.backgroundImageFit ?? "stretch";
  const position =
    bg.backgroundImagePosition ??
    (defaultPositionForFit(fit) as WidgetBackgroundImagePosition);
  return {
    backgroundSize: resolveBackgroundSize(fit),
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}

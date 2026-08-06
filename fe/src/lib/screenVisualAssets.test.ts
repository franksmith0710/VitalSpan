import { describe, expect, it } from "vitest";
import {
  createScreenBorderWidget,
  createScreenClockWidget,
  createScreenIconWidget,
  createScreenShapeWidget,
  createScreenTitleBarWidget,
  isScreenBorderWidget,
  isScreenClockWidget,
  isScreenIconWidget,
  isScreenShapeWidget,
  isScreenTitleBarWidget,
  resolveScreenWidgetLayerLabel,
  SCREEN_BORDER_MARKER,
  SCREEN_CLOCK_MARKER,
  SCREEN_ICON_MARKER,
  SCREEN_SHAPE_MARKER,
} from "./screenVisualAssets";

describe("screenVisualAssets", () => {
  it("creates clock widget with marker content", () => {
    const widget = createScreenClockWidget([]);
    expect(widget.type).toBe("text");
    expect(widget.title).toBe("时钟");
    expect(widget.textConfig?.content).toBe(SCREEN_CLOCK_MARKER);
    expect(isScreenClockWidget(widget)).toBe(true);
    expect(isScreenBorderWidget(widget)).toBe(false);
  });

  it("creates border widget with variant preset", () => {
    const widget = createScreenBorderWidget([], undefined, "border-5");
    expect(widget.textConfig?.content).toBe(SCREEN_BORDER_MARKER);
    expect(widget.textConfig?.screenStyle?.border?.variant).toBe("border-5");
    expect(isScreenBorderWidget(widget)).toBe(true);
  });

  it("creates shape and icon widgets with screenStyle", () => {
    const shape = createScreenShapeWidget([], undefined, "circle");
    expect(shape.textConfig?.content).toBe(SCREEN_SHAPE_MARKER);
    expect(shape.textConfig?.screenStyle?.shape?.shape).toBe("circle");
    expect(isScreenShapeWidget(shape)).toBe(true);

    const icon = createScreenIconWidget([], undefined, "bell");
    expect(icon.textConfig?.content).toBe(SCREEN_ICON_MARKER);
    expect(icon.textConfig?.screenStyle?.icon?.icon).toBe("bell");
    expect(isScreenIconWidget(icon)).toBe(true);
  });

  it("C1: creates title strip as text with decor background", () => {
    const widget = createScreenTitleBarWidget([]);
    expect(widget.type).toBe("text");
    expect(widget.title).toBe("标题条");
    expect(widget.textConfig?.widgetStyle?.backgroundImage).toContain("top-decor-clear");
    expect(isScreenTitleBarWidget(widget)).toBe(false);
    expect(resolveScreenWidgetLayerLabel(widget)).toBe("标题条");
  });

  it("resolves layer labels for screen assets", () => {
    const clock = createScreenClockWidget([]);
    expect(resolveScreenWidgetLayerLabel(clock)).toBe("素材 · 时钟");
    expect(resolveScreenWidgetLayerLabel(createScreenShapeWidget([]))).toBe("素材 · 图形");
    expect(resolveScreenWidgetLayerLabel(createScreenIconWidget([]))).toBe("素材 · 图标");
  });
});

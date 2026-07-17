import { describe, expect, it } from "vitest";
import {
  createScreenBorderWidget,
  createScreenClockWidget,
  isScreenBorderWidget,
  isScreenClockWidget,
  resolveScreenWidgetLayerLabel,
  SCREEN_BORDER_MARKER,
  SCREEN_CLOCK_MARKER,
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

  it("resolves layer labels for screen assets", () => {
    const clock = createScreenClockWidget([]);
    expect(resolveScreenWidgetLayerLabel(clock)).toBe("素材 · 时钟");
  });
});

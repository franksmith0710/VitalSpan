import { describe, expect, it } from "vitest";
import {
  resolveWidgetTitleChromeMetrics,
  shapeTitleChromeStyle,
  shapeTitlePresentationStyle,
  resolveShapeTitleCanvasScale,
  pixelViewTitleHeightPx,
} from "./dashboardWidgetTypography";

describe("resolveShapeTitleCanvasScale", () => {
  it("skips compensation when outer viewport already scaled", () => {
    expect(resolveShapeTitleCanvasScale(0.25, true)).toBe(1);
  });

  it("skips compensation in view mode for WYSIWYG preview", () => {
    expect(resolveShapeTitleCanvasScale(0.5, false, "view")).toBe(1);
    expect(resolveShapeTitleCanvasScale(0.5, false)).toBe(1);
  });

  it("uses canvas scale in edit mode when viewport is not locked", () => {
    expect(resolveShapeTitleCanvasScale(0.5, false, "edit")).toBe(0.5);
  });

  it("skips compensation in edit mode when design viewport is locked", () => {
    expect(resolveShapeTitleCanvasScale(0.5, true, "edit")).toBe(1);
  });
});

describe("shapeTitlePresentationStyle", () => {
  it("preserves configured font size with canvas scale compensation", () => {
    expect(
      shapeTitlePresentationStyle({ fontSize: 21, color: "#111" }, 0.5),
    ).toEqual({
      color: "#111",
      fontSize: "42px",
      lineHeight: 1.25,
    });
  });

  it("omits font size when not configured", () => {
    expect(shapeTitlePresentationStyle({ color: "#111" }, 1)).toEqual({ color: "#111" });
  });
});

describe("resolveWidgetTitleChromeMetrics", () => {
  it("uses default metrics when title font is not configured", () => {
    expect(resolveWidgetTitleChromeMetrics({})).toEqual({
      fontSizePx: 16,
      lineHeightPx: 22,
      gapPx: 4,
      blockHeightPx: 36,
    });
  });

  it("scales title-to-content gap with configured font size", () => {
    expect(resolveWidgetTitleChromeMetrics({ fontSize: 24 })).toMatchObject({
      fontSizePx: 24,
      gapPx: 6,
      blockHeightPx: 39,
    });
  });
});

describe("shapeTitleChromeStyle", () => {
  it("exposes CSS vars scaled by chrome compensation", () => {
    expect(shapeTitleChromeStyle({ fontSize: 24 }, 0.5)).toEqual({
      "--widget-title-min-row": "calc(33px / var(--pixel-canvas-chrome-scale, 0.5))",
      "--widget-title-content-gap": "calc(6px / var(--pixel-canvas-chrome-scale, 0.5))",
    });
  });
});

describe("pixelViewTitleHeightPx", () => {
  it("matches block height in design coordinates", () => {
    expect(pixelViewTitleHeightPx(1, { fontSize: 24 })).toBe(39);
    expect(pixelViewTitleHeightPx(0.5, { fontSize: 24 })).toBe(78);
  });
});

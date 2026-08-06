import { describe, expect, it } from "vitest";
import {
  shapeTitlePresentationStyle,
  resolveShapeTitleCanvasScale,
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

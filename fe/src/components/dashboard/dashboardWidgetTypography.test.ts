import { describe, expect, it } from "vitest";
import { shapeTitlePresentationStyle } from "./dashboardWidgetTypography";

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

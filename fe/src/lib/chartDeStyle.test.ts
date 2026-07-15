import { describe, expect, it } from "vitest";
import { widgetStyleToContentCss } from "./chartDeStyle";

describe("widgetStyleToContentCss", () => {
  it("applies individual padding and unified radius", () => {
    const style = widgetStyleToContentCss({
      background: "#ffffff",
      paddingMode: "individual",
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 12,
      paddingLeft: 16,
      borderRadius: 6,
    });
    expect(style.padding).toBe("4px 8px 12px 16px");
    expect(style.borderRadius).toBe("6px");
    expect(style.background).toBe("#ffffff");
  });

  it("applies backdrop blur and background image", () => {
    const style = widgetStyleToContentCss({
      backgroundImage: "https://example.com/bg.png",
      backdropBlur: 8,
      opacity: 0.9,
    });
    expect(style.backgroundImage).toContain("example.com/bg.png");
    expect(style.backdropFilter).toBe("blur(8px)");
    expect(style.opacity).toBe(0.9);
  });
});

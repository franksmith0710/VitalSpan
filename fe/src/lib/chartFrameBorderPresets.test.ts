import { describe, expect, it } from "vitest";
import {
  buildChartFrameBorderSvgUrl,
  CHART_FRAME_BORDER_PRESETS,
  resolveChartFrameBorderStyle,
} from "./chartFrameBorderPresets";
import { widgetStyleToContentCss } from "./chartDeStyle";

describe("chartFrameBorderPresets", () => {
  it("exposes nine frame presets", () => {
    expect(CHART_FRAME_BORDER_PRESETS).toHaveLength(9);
    expect(CHART_FRAME_BORDER_PRESETS[0]?.label).toBe("边框1");
  });

  it("builds tinted svg data urls", () => {
    const url = buildChartFrameBorderSvgUrl("frame-2", "#ff0000");
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url)).toContain("#ff0000");
  });

  it("resolves border-image inline styles", () => {
    const style = resolveChartFrameBorderStyle("frame-1", "#3370ff");
    expect(style.borderImageSource).toContain("data:image/svg+xml");
    expect(style.borderWidth).toBe(12);
  });
});

describe("widgetStyleToContentCss frame mode", () => {
  it("applies decorative frame overlay when backgroundMode is frame", () => {
    const { surface, frameLayer } = widgetStyleToContentCss({
      backgroundShow: true,
      backgroundMode: "frame",
      framePresetId: "frame-3",
      frameColor: "#3370ff",
    });
    expect(surface.borderImageSource).toBeUndefined();
    expect(frameLayer?.borderImageSource).toContain("data:image/svg+xml");
    expect(surface.backgroundImage).toBeUndefined();
  });

  it("applies background image on overlay layer", () => {
    const { surface, backgroundLayer } = widgetStyleToContentCss({
      backgroundShow: true,
      backgroundMode: "image",
      backgroundImage: "https://example.com/bg.png",
    });
    expect(surface.backgroundImage).toBeUndefined();
    expect(backgroundLayer?.backgroundImage).toContain("example.com/bg.png");
  });

  it("skips visual background when backgroundShow is false", () => {
    const { surface, frameLayer } = widgetStyleToContentCss({
      backgroundShow: false,
      backgroundMode: "frame",
      framePresetId: "frame-1",
      padding: 12,
    });
    expect(frameLayer).toBeNull();
    expect(surface.padding).toBe("12px");
  });
});

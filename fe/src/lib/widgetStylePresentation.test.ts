import { describe, expect, it } from "vitest";
import { buildWidgetBackgroundPresentation } from "./widgetStylePresentation";

describe("buildWidgetBackgroundPresentation", () => {
  it("applies frameOpacity only to decorative frame layer", () => {
    const presentation = buildWidgetBackgroundPresentation(
      {
        backgroundShow: true,
        backgroundMode: "frame",
        framePresetId: "frame-1",
        frameColor: "#465fff",
        background: "#ffffff",
        opacity: 0.4,
        frameOpacity: 0.8,
      },
      "light",
    );
    expect(presentation.frameLayer?.opacity).toBe(0.8);
    expect(presentation.frameLayer?.opacity).not.toBe(presentation.backgroundLayer?.opacity);
  });

  it("keeps decorative frame fully opaque when frameOpacity unset (ignores background opacity)", () => {
    const presentation = buildWidgetBackgroundPresentation(
      {
        backgroundShow: true,
        backgroundMode: "frame",
        framePresetId: "frame-1",
        opacity: 0.5,
      },
      "light",
    );
    expect(presentation.frameLayer?.opacity).toBe(1);
    expect(presentation.frameLayer?.transform).toContain("translateZ");
  });
});

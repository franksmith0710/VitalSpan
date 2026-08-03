import { describe, expect, it } from "vitest";
import {
  filterStyleSectionsForChart,
  resolveLegendEditorMode,
  supportsDepthVisualToggle,
  supportsPaletteOpacity,
  supportsSeriesGradientToggle,
} from "./chartStylePanelGates";

describe("chartStylePanelGates", () => {
  it("hides legend for gauge and shows for bar", () => {
    expect(filterStyleSectionsForChart("gauge", ["legend", "label", "palette"])).toEqual([
      "label",
      "palette",
    ]);
    expect(filterStyleSectionsForChart("bar", ["legend", "label", "palette"])).toEqual([
      "legend",
      "label",
      "palette",
    ]);
  });

  it("keeps label section for kpi format controls", () => {
    expect(filterStyleSectionsForChart("kpi", ["label", "palette"])).toEqual(["label", "palette"]);
  });

  it("depth visual only for supported cartesian types", () => {
    expect(supportsDepthVisualToggle("bar")).toBe(true);
    expect(supportsDepthVisualToggle("line")).toBe(false);
    expect(supportsDepthVisualToggle("gauge")).toBe(true);
  });

  it("series gradient whitelist: bar/line yes, pie/map no", () => {
    expect(supportsSeriesGradientToggle("bar")).toBe(true);
    expect(supportsSeriesGradientToggle("line")).toBe(true);
    expect(supportsSeriesGradientToggle("pie")).toBe(false);
    expect(supportsSeriesGradientToggle("map")).toBe(false);
    expect(supportsSeriesGradientToggle("gauge")).toBe(false);
    expect(supportsSeriesGradientToggle("scatter")).toBe(false);
  });

  it("palette opacity only for 2D map", () => {
    expect(supportsPaletteOpacity("map")).toBe(true);
    expect(supportsPaletteOpacity("bar")).toBe(false);
    expect(supportsPaletteOpacity("t-heatmap")).toBe(false);
  });

  it("resolves legend editor mode", () => {
    expect(resolveLegendEditorMode("bar")).toBe("shell");
    expect(resolveLegendEditorMode("pie")).toBe("d3");
    expect(resolveLegendEditorMode("gauge")).toBe("none");
    expect(resolveLegendEditorMode("waterfall")).toBe("d3");
  });
});

import { describe, expect, it } from "vitest";
import {
  filterStyleSectionsForChart,
  resolveLegendEditorMode,
  supportsDepthVisualToggle,
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

  it("series gradient excludes map and gauge", () => {
    expect(supportsSeriesGradientToggle("bar")).toBe(true);
    expect(supportsSeriesGradientToggle("map")).toBe(false);
    expect(supportsSeriesGradientToggle("gauge")).toBe(false);
  });

  it("resolves legend editor mode", () => {
    expect(resolveLegendEditorMode("bar")).toBe("shell");
    expect(resolveLegendEditorMode("pie")).toBe("d3");
    expect(resolveLegendEditorMode("gauge")).toBe("none");
  });
});

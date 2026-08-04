import { describe, expect, it } from "vitest";
import {
  resolveGeoRegionLabelColorHex,
  resolveGeoRegionLabelFontSize,
  resolveGeoRegionLabelPanelColorHex,
} from "@/components/charts/engine/geo/geoRegionLabelStyle";
import { resolveD3Theme } from "@/components/charts/engine/d3/core/themeEngine";

describe("geoRegionLabelStyle", () => {
  it("defaults font size to chart standard minimum", () => {
    expect(resolveGeoRegionLabelFontSize({})).toBe(10);
    expect(resolveGeoRegionLabelFontSize({ regionLabelFontSize: 14 })).toBe(14);
  });

  it("uses custom color or theme axis label", () => {
    const theme = resolveD3Theme("light");
    expect(resolveGeoRegionLabelColorHex({ regionLabelColor: "#112233" }, theme)).toBe("#112233");
    expect(resolveGeoRegionLabelPanelColorHex({}, false)).toBe("#475569");
    expect(resolveGeoRegionLabelPanelColorHex({}, true)).toBe("#cbd5e1");
  });
});

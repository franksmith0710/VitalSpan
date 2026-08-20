import { describe, expect, it } from "vitest";
import { applyGisGlobeToStyle, gisFogToMapLibreSky, mapLibreSkyForPreset, spaceBackdropForPreset } from "@/components/charts/engine/maplibre/gisAtmosphereSky";
import { getGlobeRadiusPixels } from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { resolveGisStarIntensity } from "@/components/charts/engine/maplibre/gisStarfield";

describe("gisAtmosphereSky", () => {
  it("maps deep-space preset to dark sky with full atmosphere", () => {
    const sky = mapLibreSkyForPreset("deep-space");
    expect(sky["sky-color"]).toBe("#03040c");
    expect(sky["atmosphere-blend"]).toBe(1);
  });

  it("maps day preset to bright sky", () => {
    const sky = mapLibreSkyForPreset("day");
    expect(sky["sky-color"]).toBe("#9fd0fb");
    expect(sky["atmosphere-blend"]).toBeLessThan(0.8);
  });

  it("falls back from fog star-intensity", () => {
    expect(gisFogToMapLibreSky({ "star-intensity": 0.6 })["sky-color"]).toBe("#03040c");
    expect(gisFogToMapLibreSky({ "star-intensity": 0.1 })["sky-color"]).toBe("#120818");
  });

  it("provides backdrop colors per preset", () => {
    expect(spaceBackdropForPreset("deep-space")).toBe("#03040c");
    expect(spaceBackdropForPreset("day")).toBe("#b8dcf8");
  });

  it("embeds globe projection and sky in style spec", () => {
    const style = applyGisGlobeToStyle({ version: 8, layers: [] }, "globe", "day");
    expect(style.projection).toEqual({ type: "globe" });
    expect(style.sky?.["sky-color"]).toBe("#9fd0fb");
  });
});

describe("gisGlobeLayout", () => {
  it("computes globe radius from world size and latitude", () => {
    expect(getGlobeRadiusPixels(512, 0)).toBeCloseTo(512 / (2 * Math.PI), 4);
  });
});

describe("gisStarfield", () => {
  it("enables stars for deep-space and dusk only", () => {
    expect(resolveGisStarIntensity("deep-space")).toBeGreaterThan(0.8);
    expect(resolveGisStarIntensity("dusk")).toBeGreaterThan(0);
    expect(resolveGisStarIntensity("day")).toBe(0);
  });
});

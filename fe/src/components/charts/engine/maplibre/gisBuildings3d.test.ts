import { describe, expect, it } from "vitest";
import {
  appendBuildings3dLayerToStyle,
  BUILDINGS_3D_MIN_ZOOM,
  createBuildings3dLayerSpec,
  FLAT_BUILDINGS_LAYER_ID,
  GIS_BUILDINGS_3D_LAYER_ID,
} from "@/components/charts/engine/maplibre/gisBuildings3d";
import { layers, namedFlavor } from "@protomaps/basemaps";

describe("gisBuildings3d", () => {
  it("creates extrusion layer with vertical gradient", () => {
    const layer = createBuildings3dLayerSpec("light", true);
    expect(layer.type).toBe("fill-extrusion");
    expect(layer.minzoom).toBe(BUILDINGS_3D_MIN_ZOOM);
    expect(layer.paint?.["fill-extrusion-vertical-gradient"]).toBe(true);
  });

  it("hides flat buildings when 3d enabled", () => {
    const base = {
      version: 8 as const,
      layers: layers("protomaps", namedFlavor("light"), { lang: "zh-Hans" }),
    };
    const next = appendBuildings3dLayerToStyle(base, "light", true);
    expect(next.layers?.find((layer) => layer.id === FLAT_BUILDINGS_LAYER_ID)?.layout?.visibility).toBe(
      "none",
    );
    expect(next.layers?.some((layer) => layer.id === GIS_BUILDINGS_3D_LAYER_ID)).toBe(true);
  });
});

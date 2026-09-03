import { describe, expect, it, vi } from "vitest";
import {
  applyGisGraticule,
  buildGraticuleGeoJson,
  GIS_GRATICULE_LAYER_ID,
  GIS_GRATICULE_SOURCE_ID,
  placeGisGraticuleLayer,
} from "@/components/charts/engine/maplibre/gisGraticule";

describe("buildGraticuleGeoJson", () => {
  it("includes meridians and parallels at step interval", () => {
    const geojson = buildGraticuleGeoJson(15);
    const meridians = geojson.features.filter(
      (feature) => feature.properties?.kind === "meridian",
    );
    const parallels = geojson.features.filter(
      (feature) => feature.properties?.kind === "parallel",
    );
    expect(meridians.length).toBeGreaterThan(20);
    expect(parallels.length).toBeGreaterThan(8);
  });
});

describe("placeGisGraticuleLayer", () => {
  it("moves graticule below data overlay layers when present", () => {
    const moveLayer = vi.fn();
    const map = {
      getLayer: (id: string) => (id === GIS_GRATICULE_LAYER_ID ? { id } : undefined),
      getStyle: () => ({
        layers: [{ id: "vs-gis-layer-sales-circles" }, { id: GIS_GRATICULE_LAYER_ID }],
      }),
      moveLayer,
    };
    placeGisGraticuleLayer(map as never);
    expect(moveLayer).toHaveBeenCalledWith(
      GIS_GRATICULE_LAYER_ID,
      "vs-gis-layer-sales-circles",
    );
  });
});

describe("applyGisGraticule", () => {
  it("re-adds line layer when source exists but layer was removed", () => {
    const setData = vi.fn();
    const layers = new Map<string, unknown>();
    const addLayer = vi.fn((spec: { id: string }) => {
      layers.set(spec.id, spec);
    });
    const moveLayer = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) =>
        id === GIS_GRATICULE_SOURCE_ID ? { setData } : undefined,
      getLayer: (id: string) => layers.get(id),
      getStyle: () => ({ layers: [] }),
      addSource: vi.fn(),
      addLayer,
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      moveLayer,
    };

    applyGisGraticule(map as never, true);

    expect(setData).toHaveBeenCalled();
    expect(addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: GIS_GRATICULE_LAYER_ID, type: "line" }),
    );
    expect(moveLayer).toHaveBeenCalledWith(GIS_GRATICULE_LAYER_ID);
  });
});

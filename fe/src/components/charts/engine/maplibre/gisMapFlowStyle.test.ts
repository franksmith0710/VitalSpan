import { describe, expect, it, vi } from "vitest";
import {
  buildGisFlowLayerDefinitions,
  buildGisFlowStyleKey,
  emptyGisFlowGeoJson,
  syncGisFlowData,
  syncGisFlowStyle,
  GIS_FLOW_SOURCE_ID,
  GIS_FLOW_LINE_LAYER_ID,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";

describe("gisMapFlowStyle", () => {
  it("adds flow source and line layer", () => {
    const { source, layers } = buildGisFlowLayerDefinitions(emptyGisFlowGeoJson(), {
      flavor: "light",
      flow: { enabled: true, color: "#112233", opacity: 0.6 },
    });
    expect(source.id).toBe("vs-gis-flow");
    expect(layers).toHaveLength(1);
    expect(layers[0]?.id).toBe("vs-gis-flow-lines");
    expect(layers[0]?.paint?.["line-color"]).toBeDefined();
  });

  it("changes style key when flow paint changes", () => {
    const a = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#111111" } });
    const b = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#222222" } });
    expect(a).not.toBe(b);
  });
});

describe("syncGisFlowData", () => {
  it("calls setData on flow source when style is loaded", () => {
    const setData = vi.fn();
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [121.47, 31.23],
              [-118.24, 34.05],
            ],
          },
          properties: { weight: 1 },
        },
      ],
    };
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) => (id === GIS_FLOW_SOURCE_ID ? { setData } : undefined),
      once: vi.fn(),
    };

    syncGisFlowData(map as never, geojson);
    expect(setData).toHaveBeenCalledWith(geojson);
  });

  it("writes empty collection when geojson is null", () => {
    const setData = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      getSource: () => ({ setData }),
      once: vi.fn(),
    };

    syncGisFlowData(map as never, null);
    expect(setData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
  });
});

describe("syncGisFlowStyle", () => {
  it("updates line paint when layer exists", () => {
    const setPaintProperty = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      getLayer: (id: string) => (id === GIS_FLOW_LINE_LAYER_ID ? {} : undefined),
      setPaintProperty,
      once: vi.fn(),
    };

    syncGisFlowStyle(map as never, {
      flavor: "light",
      flow: { enabled: true, color: "#aabbcc", opacity: 0.4 },
    });

    expect(setPaintProperty).toHaveBeenCalledWith(
      GIS_FLOW_LINE_LAYER_ID,
      "line-opacity",
      0.4,
    );
  });
});

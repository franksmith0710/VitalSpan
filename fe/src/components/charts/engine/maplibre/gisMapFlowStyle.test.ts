import { describe, expect, it, vi } from "vitest";
import {
  buildGisFlowLayerDefinitions,
  buildGisFlowLineGradient,
  buildGisFlowLineWidth,
  buildGisFlowStyleKey,
  emptyGisFlowGeoJson,
  syncGisFlowData,
  syncGisFlowStyle,
  GIS_FLOW_SOURCE_ID,
  GIS_FLOW_SHADOW_LAYER_ID,
  GIS_FLOW_GLOW_LAYER_ID,
  GIS_FLOW_LINE_LAYER_ID,
  GIS_FLOW_PULSE_LAYER_ID,
  GIS_FLOW_HUB_LAYER_ID,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";

describe("gisMapFlowStyle", () => {
  it("adds flow source with lineMetrics and stacked layers", () => {
    const { source, layers } = buildGisFlowLayerDefinitions(emptyGisFlowGeoJson(), {
      flavor: "light",
      flow: { enabled: true, color: "#112233", opacity: 0.6 },
    });
    expect(source.id).toBe("vs-gis-flow");
    expect(source.spec.lineMetrics).toBe(true);
    expect(layers).toHaveLength(5);
    expect(layers[0]?.id).toBe(GIS_FLOW_SHADOW_LAYER_ID);
    expect(layers[1]?.id).toBe(GIS_FLOW_GLOW_LAYER_ID);
    expect(layers[2]?.id).toBe(GIS_FLOW_LINE_LAYER_ID);
    expect(layers[3]?.id).toBe(GIS_FLOW_PULSE_LAYER_ID);
    expect(layers[4]?.id).toBe(GIS_FLOW_HUB_LAYER_ID);
    expect(layers[2]?.paint?.["line-gradient"]).toBeDefined();
    expect(layers[3]?.paint?.["line-width"]).toBeDefined();
    expect(layers[3]?.paint?.["line-dasharray"]).toBeUndefined();
  });

  it("builds crest highlight gradient", () => {
    const gradient = buildGisFlowLineGradient("#f97316");
    expect(gradient[0]).toBe("interpolate");
    expect(gradient[2]).toEqual(["line-progress"]);
    expect(String(gradient[8])).toContain("255, 255, 255");
  });

  it("changes style key when flow paint changes", () => {
    const a = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#111111" } });
    const b = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#222222" } });
    expect(a).not.toBe(b);
  });

  it("scales line width with zoom for globe overview", () => {
    const width = buildGisFlowLineWidth({
      enabled: true,
      color: "#f97316",
      widthMin: 3,
      widthMax: 9,
      opacity: 1,
      scaleByMetric: false,
      autoFit: true,
      animate: true,
    });
    expect(width[0]).toBe("interpolate");
    expect(width[2]).toEqual(["zoom"]);
    expect(width[3]).toBe(0);
    expect(width[4]).toBeCloseTo(7.2);
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
      getLayer: () => ({}),
      moveLayer: vi.fn(),
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
      getLayer: () => ({}),
      moveLayer: vi.fn(),
      once: vi.fn(),
    };

    syncGisFlowData(map as never, null);
    expect(setData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
  });
});

describe("syncGisFlowStyle", () => {
  it("updates line paint when layer exists", () => {
    const setPaintProperty = vi.fn();
    const moveLayer = vi.fn();
    const layerIds = new Set([
      GIS_FLOW_SHADOW_LAYER_ID,
      GIS_FLOW_GLOW_LAYER_ID,
      GIS_FLOW_LINE_LAYER_ID,
      GIS_FLOW_PULSE_LAYER_ID,
      GIS_FLOW_HUB_LAYER_ID,
    ]);
    const map = {
      isStyleLoaded: () => true,
      getLayer: (id: string) => (layerIds.has(id) ? {} : undefined),
      setPaintProperty,
      moveLayer,
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

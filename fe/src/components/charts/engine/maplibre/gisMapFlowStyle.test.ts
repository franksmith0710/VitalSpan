import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGisFlowLayerDefinitions,
  buildGisFlowLineGradient,
  buildGisFlowLineWidth,
  buildGisFlowStyleKey,
  emptyGisFlowGeoJson,
  resetGisFlowDataSyncGenerationForTests,
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
    expect(layers[2]?.paint?.["line-color"]).toBeDefined();
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
      arcLift: 0.62,
    });
    expect(width[0]).toBe("interpolate");
    expect(width[2]).toEqual(["zoom"]);
    expect(width[3]).toBe(0);
    expect(width[4]).toBeCloseTo(16.8);
  });

  it("avoids nested zoom arithmetic when scaling by metric", () => {
    const width = buildGisFlowLineWidth({
      enabled: true,
      color: "#f97316",
      widthMin: 4,
      widthMax: 14,
      opacity: 1,
      scaleByMetric: true,
      autoFit: true,
      animate: true,
      arcLift: 0.62,
    });
    expect(width[0]).toBe("interpolate");
    expect(width[2]).toEqual(["zoom"]);
    const inner = width[4];
    expect(Array.isArray(inner)).toBe(true);
    expect(inner?.[0]).toBe("interpolate");
    expect(JSON.stringify(width)).not.toContain('"*"');
    expect(JSON.stringify(width)).not.toContain('"+"');
  });
});

describe("syncGisFlowData", () => {
  beforeEach(() => {
    resetGisFlowDataSyncGenerationForTests();
  });

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
      getSource: (id: string) => (id === GIS_FLOW_SOURCE_ID ? { setData } : undefined),
      getLayer: () => ({}),
      moveLayer: vi.fn(),
      once: vi.fn(),
    };

    syncGisFlowData(map as never, null);
    expect(setData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
  });

  it("adds flow source at runtime when style omits flow layers", () => {
    const setData = vi.fn();
    const addSource = vi.fn();
    const addLayer = vi.fn();
    const sources = new Map<string, { setData: typeof setData }>();
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
          properties: {},
        },
      ],
    };
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) => sources.get(id),
      getLayer: () => undefined,
      addSource: (id: string, spec: unknown) => {
        addSource(id, spec);
        sources.set(id, { setData });
      },
      addLayer,
      moveLayer: vi.fn(),
      once: vi.fn(),
    };

    syncGisFlowData(map as never, geojson, {
      flavor: "light",
      layersActive: true,
      flow: { enabled: true, color: "#f97316" },
    });

    expect(addSource).toHaveBeenCalledWith(GIS_FLOW_SOURCE_ID, expect.objectContaining({ type: "geojson" }));
    expect(addLayer).toHaveBeenCalled();
    expect(setData).toHaveBeenCalledWith(geojson);
  });

  it("does not register idle callback that can overwrite newer flow data", () => {
    const setData = vi.fn();
    const once = vi.fn();
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
          properties: {},
        },
      ],
    };
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) => (id === GIS_FLOW_SOURCE_ID ? { setData } : undefined),
      getLayer: () => ({}),
      moveLayer: vi.fn(),
      once,
    };

    syncGisFlowData(map as never, geojson);
    expect(once).not.toHaveBeenCalled();
    expect(setData).toHaveBeenCalledWith(geojson);
  });

  it("ignores stale style.load callbacks after a newer sync", () => {
    const setData = vi.fn();
    const queued: Array<() => void> = [];
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
          properties: {},
        },
      ],
    };
    let styleLoaded = false;
    const map = {
      isStyleLoaded: () => styleLoaded,
      loaded: () => false,
      getSource: (id: string) => (id === GIS_FLOW_SOURCE_ID ? { setData } : undefined),
      getLayer: () => ({}),
      moveLayer: vi.fn(),
      once: (_event: string, cb: () => void) => {
        queued.push(cb);
      },
      off: vi.fn(),
    };

    syncGisFlowData(map as never, null);
    syncGisFlowData(map as never, geojson);
    styleLoaded = true;
    for (const run of queued) run();

    expect(setData).not.toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
    expect(setData).toHaveBeenCalledWith(geojson);
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

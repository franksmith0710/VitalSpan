import { describe, expect, it, vi } from "vitest";
import {
  resolveGisOverlayStyle,
  readGisProject,
} from "@/components/charts/engine/maplibre/gisProject";
import {
  buildGisOverlayCirclePaint,
  buildGisOverlayCircleRadius,
  buildGisOverlayStyleKey,
  syncGisOverlayData,
} from "@/components/charts/engine/maplibre/gisMapOverlayStyle";
import { GIS_OVERLAY_SOURCE_ID } from "@/components/charts/engine/maplibre/gisMapStyle";
import { appendGisOverlayLayers, buildPmtilesStyle } from "@/components/charts/engine/maplibre/gisMapStyle";
import {
  GIS_OVERLAY_CIRCLE_LAYER_ID,
  GIS_OVERLAY_LABEL_LAYER_ID,
  GIS_OVERLAY_SOURCE_ID,
} from "@/components/charts/engine/maplibre/gisMapStyle";

const RESOLVED = {
  id: "planet-z15",
  name: "Planet Z15 Global",
  pmtilesUrl: "http://localhost:8080/planet-z15-20260817.pmtiles",
  glyphsUrl: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  spriteUrl: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
};

describe("resolveGisOverlayStyle", () => {
  it("uses chart palette color by default", () => {
    expect(resolveGisOverlayStyle(undefined, ["#abcdef"]).color).toBe("#abcdef");
  });

  it("clamps radius max to min", () => {
    const resolved = resolveGisOverlayStyle({ radiusMin: 10, radiusMax: 2 });
    expect(resolved.radiusMin).toBe(10);
    expect(resolved.radiusMax).toBeGreaterThanOrEqual(10);
  });

  it("respects overlay color override", () => {
    expect(resolveGisOverlayStyle({ color: "#ff0000" }, ["#abcdef"]).color).toBe("#ff0000");
  });
});

describe("buildGisOverlayCircleRadius", () => {
  it("uses fixed radius when scaleByMetric is false", () => {
    const resolved = resolveGisOverlayStyle({ scaleByMetric: false, radiusMin: 4, radiusMax: 12 });
    expect(buildGisOverlayCircleRadius(resolved)).toBe(8);
  });

  it("interpolates sizeNorm when scaleByMetric is true", () => {
    const resolved = resolveGisOverlayStyle({ scaleByMetric: true, radiusMin: 4, radiusMax: 14 });
    expect(buildGisOverlayCircleRadius(resolved)).toEqual([
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "sizeNorm"], 0.5],
      0,
      4,
      1,
      14,
    ]);
  });
});

describe("appendGisOverlayLayers", () => {
  it("adds overlay source and layers with resolved paint", () => {
    const base = buildPmtilesStyle(RESOLVED, "zh-Hans");
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [116.4, 39.9] },
          properties: { value: 10, sizeNorm: 0.5 },
        },
      ],
    };
    const style = appendGisOverlayLayers(base, geojson, {
      flavor: "light",
      overlay: { color: "#112233", opacity: 0.5 },
      chartColors: ["#999999"],
    });
    expect(style.sources?.[GIS_OVERLAY_SOURCE_ID]).toBeDefined();
    const circle = style.layers?.find((layer) => layer.id === GIS_OVERLAY_CIRCLE_LAYER_ID);
    expect(circle?.paint?.["circle-color"]).toBe("#112233");
    expect(circle?.paint?.["circle-opacity"]).toBe(0.5);
    expect(style.layers?.some((layer) => layer.id === GIS_OVERLAY_LABEL_LAYER_ID)).toBe(true);
  });
});

describe("buildGisOverlayStyleKey", () => {
  it("changes when overlay paint changes", () => {
    const a = buildGisOverlayStyleKey({ flavor: "light", overlay: { color: "#111111" } });
    const b = buildGisOverlayStyleKey({ flavor: "light", overlay: { color: "#222222" } });
    expect(a).not.toBe(b);
  });
});

describe("readGisProject overlay", () => {
  it("normalizes overlay fields", () => {
    const project = readGisProject({
      chartType: "gis-map",
      nativeBody: {
        gisProject: {
          overlay: {
            color: "#123456",
            radiusMin: 3,
            radiusMax: 20,
            opacity: 0.6,
            showLabels: false,
            labelMinZoom: 6,
            scaleByMetric: false,
            strokeWidth: 2,
          },
        },
      },
    });
    expect(project.overlay).toEqual({
      color: "#123456",
      radiusMin: 3,
      radiusMax: 20,
      opacity: 0.6,
      showLabels: false,
      labelMinZoom: 6,
      scaleByMetric: false,
      strokeWidth: 2,
    });
  });
});

describe("buildGisOverlayCirclePaint", () => {
  it("includes stroke properties", () => {
    const paint = buildGisOverlayCirclePaint(resolveGisOverlayStyle({ strokeColor: "#000000", strokeWidth: 2 }));
    expect(paint["circle-stroke-color"]).toBe("#000000");
    expect(paint["circle-stroke-width"]).toBe(2);
  });
});

describe("syncGisOverlayData", () => {
  it("calls setData on overlay source without waiting when style is loaded", () => {
    const setData = vi.fn();
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [116.4, 39.9] },
          properties: { value: 1 },
        },
      ],
    };
    const map = {
      isStyleLoaded: () => true,
      getSource: (id: string) => (id === GIS_OVERLAY_SOURCE_ID ? { setData } : undefined),
      once: vi.fn(),
    };

    syncGisOverlayData(map as never, geojson);
    expect(setData).toHaveBeenCalledWith(geojson);
  });

  it("writes empty collection when geojson is null", () => {
    const setData = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      getSource: () => ({ setData }),
      once: vi.fn(),
    };

    syncGisOverlayData(map as never, null);
    expect(setData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
  });
});

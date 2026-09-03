import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";

export const GIS_GRATICULE_SOURCE_ID = "vs-gis-graticule";
export const GIS_GRATICULE_LAYER_ID = "vs-gis-graticule-lines";

const DATA_OVERLAY_PREFIXES = ["vs-gis-layer-", "vs-gis-overlay-"];

const GRATICULE_PAINT = {
  "line-color": "#b8c9e0",
  "line-opacity": 0.72,
  "line-width": 1.25,
} as const;

const GRATICULE_LAYOUT = {
  "line-join": "round",
  "line-cap": "round",
} as const;

/** 生成经纬网 GeoJSON（默认 15° 间隔，纬度截断至 ±85° 避免极点畸变）。 */
export function buildGraticuleGeoJson(stepDeg = 15): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lng = -180; lng <= 180; lng += stepDeg) {
    features.push({
      type: "Feature",
      properties: { kind: "meridian", value: lng },
      geometry: {
        type: "LineString",
        coordinates: [
          [lng, -85],
          [lng, 85],
        ],
      },
    });
  }
  for (let lat = -75; lat <= 75; lat += stepDeg) {
    const coordinates: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 2) {
      coordinates.push([lng, lat]);
    }
    features.push({
      type: "Feature",
      properties: { kind: "parallel", value: lat },
      geometry: { type: "LineString", coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

function graticuleLayerSpec(): import("maplibre-gl").LineLayerSpecification {
  return {
    id: GIS_GRATICULE_LAYER_ID,
    type: "line",
    source: GIS_GRATICULE_SOURCE_ID,
    paint: GRATICULE_PAINT,
    layout: GRATICULE_LAYOUT,
  };
}

/** 置于昼夜遮罩之上、业务散点/热力之下，避免被 night raster 完全盖住。 */
export function placeGisGraticuleLayer(map: MapLibreMap): void {
  if (!map.getLayer(GIS_GRATICULE_LAYER_ID)) return;
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (DATA_OVERLAY_PREFIXES.some((prefix) => layer.id.startsWith(prefix))) {
      try {
        map.moveLayer(GIS_GRATICULE_LAYER_ID, layer.id);
      } catch {
        /* layer race during style swap */
      }
      return;
    }
  }
  try {
    map.moveLayer(GIS_GRATICULE_LAYER_ID);
  } catch {
    /* style tearing down */
  }
}

function applyGisGraticuleNow(map: MapLibreMap, enabled: boolean) {
  if (!map.isStyleLoaded()) return;

  if (!enabled) {
    if (map.getLayer(GIS_GRATICULE_LAYER_ID)) map.removeLayer(GIS_GRATICULE_LAYER_ID);
    if (map.getSource(GIS_GRATICULE_SOURCE_ID)) map.removeSource(GIS_GRATICULE_SOURCE_ID);
    return;
  }

  const geojson = buildGraticuleGeoJson();
  const existing = map.getSource(GIS_GRATICULE_SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geojson);
  } else {
    map.addSource(GIS_GRATICULE_SOURCE_ID, { type: "geojson", data: geojson });
  }

  if (!map.getLayer(GIS_GRATICULE_LAYER_ID)) {
    map.addLayer(graticuleLayerSpec());
  }
  placeGisGraticuleLayer(map);
  const nightLayerId = "vs-gis-sun-night-layer";
  if (map.getLayer(nightLayerId)) {
    try {
      map.moveLayer(nightLayerId, GIS_GRATICULE_LAYER_ID);
    } catch {
      /* sun engine may re-order on next render */
    }
  }
}

export function applyGisGraticule(map: MapLibreMap, enabled: boolean) {
  whenGisMapStyleReady(map, () => applyGisGraticuleNow(map, enabled));
}

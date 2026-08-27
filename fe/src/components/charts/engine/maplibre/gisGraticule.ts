import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

export const GIS_GRATICULE_SOURCE_ID = "vs-gis-graticule";
export const GIS_GRATICULE_LAYER_ID = "vs-gis-graticule-lines";

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

function findGraticuleInsertBefore(map: MapLibreMap): string | undefined {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.id.startsWith("vs-gis-")) return layer.id;
  }
  return undefined;
}

export function applyGisGraticule(map: MapLibreMap, enabled: boolean) {
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
    return;
  }

  map.addSource(GIS_GRATICULE_SOURCE_ID, { type: "geojson", data: geojson });
  map.addLayer(
    {
      id: GIS_GRATICULE_LAYER_ID,
      type: "line",
      source: GIS_GRATICULE_SOURCE_ID,
      paint: {
        "line-color": "rgba(148, 163, 184, 0.5)",
        "line-width": 1,
      },
    },
    findGraticuleInsertBefore(map),
  );
}

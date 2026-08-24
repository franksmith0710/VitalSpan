type MapLibreMap = import("maplibre-gl").Map;

export function computeGeoJsonBounds(
  geoJson: GeoJSON.FeatureCollection | null,
): [number, number, number, number] | null {
  if (!geoJson?.features.length) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const feature of geoJson.features) {
    if (feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function buildGeoJsonBoundsKey(geoJson: GeoJSON.FeatureCollection | null): string | null {
  const bounds = computeGeoJsonBounds(geoJson);
  return bounds ? bounds.join(",") : null;
}

export function fitGisOverlayBounds(
  map: MapLibreMap,
  geoJson: GeoJSON.FeatureCollection | null,
  options?: { padding?: number; maxZoom?: number; duration?: number },
) {
  const bounds = computeGeoJsonBounds(geoJson);
  if (!bounds) return false;
  const [minLng, minLat, maxLng, maxLat] = bounds;
  if (minLng === maxLng && minLat === maxLat) {
    map.easeTo({
      center: [minLng, minLat],
      zoom: Math.min(options?.maxZoom ?? 10, 8),
      duration: options?.duration ?? 800,
    });
    return true;
  }
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: options?.padding ?? 48,
      maxZoom: options?.maxZoom ?? 10,
      duration: options?.duration ?? 800,
    },
  );
  return true;
}

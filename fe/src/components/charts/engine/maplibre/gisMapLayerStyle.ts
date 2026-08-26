import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, GisProjectLayer } from "@/components/charts/engine/maplibre/gisProject";
import {
  buildGisOverlayCirclePaint,
  buildGisOverlayLabelLayout,
  buildGisOverlayLabelPaint,
  buildGisOverlayLayerDefinitions,
  buildGisOverlayStyleKey,
  emptyGisOverlayGeoJson,
  type GisOverlayLayerOptions,
} from "@/components/charts/engine/maplibre/gisMapOverlayStyle";
import { whenGisMapStyleReady } from "@/components/charts/engine/maplibre/gisMapRuntime";
import { resolveGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";

type MapLibreMap = import("maplibre-gl").Map;

export function gisLayerSourceId(layerId: string): string {
  return `vs-gis-layer-${layerId}`;
}

export function gisLayerHeatmapId(layerId: string): string {
  return `vs-gis-layer-${layerId}-heat`;
}

export type GisLayerRuntimeEntry = {
  layer: GisProjectLayer;
  geoJson: GeoJSON.FeatureCollection | null;
  options: GisOverlayLayerOptions;
};

function buildHeatmapLayer(
  layerId: string,
  sourceId: string,
  resolved: ReturnType<typeof resolveGisOverlayStyle>,
  layerOpacity: number,
): LayerSpecification {
  const radius = (resolved.radiusMin + resolved.radiusMax) / 2;
  return {
    id: gisLayerHeatmapId(layerId),
    type: "heatmap",
    source: sourceId,
    layout: { visibility: "visible" },
    paint: {
      "heatmap-weight": ["coalesce", ["get", "value"], 0.5],
      "heatmap-intensity": 1,
      "heatmap-radius": radius * 2,
      "heatmap-opacity": resolved.opacity * layerOpacity,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0, 0, 255, 0)",
        0.2,
        "rgb(0, 0, 255)",
        0.5,
        "rgb(0, 255, 255)",
        0.8,
        "rgb(255, 255, 0)",
        1,
        "rgb(255, 0, 0)",
      ],
    },
  };
}

function buildLayerDefinitions(entry: GisLayerRuntimeEntry) {
  const sourceId = gisLayerSourceId(entry.layer.id);
  const data = entry.geoJson ?? emptyGisOverlayGeoJson();
  const layerOpacity = entry.layer.opacity ?? 1;
  const visible = entry.layer.visible !== false;

  if (entry.layer.kind === "heatmap") {
    const resolved = resolveGisOverlayStyle(entry.layer.style, entry.options.chartColors);
    return {
      source: {
        id: sourceId,
        spec: { type: "geojson" as const, data },
      },
      layers: [
        {
          ...buildHeatmapLayer(entry.layer.id, sourceId, resolved, layerOpacity),
          layout: { visibility: visible ? "visible" : "none" },
        },
      ],
    };
  }

  const { source, layers } = buildGisOverlayLayerDefinitions(data, entry.options);
  return {
    source: { id: sourceId, spec: source.spec },
    layers: layers.map((spec) => ({
      ...spec,
      id: spec.id.replace("vs-gis-overlay", `vs-gis-layer-${entry.layer.id}`),
      source: sourceId,
      layout: {
        ...(spec.layout ?? {}),
        visibility: visible ? "visible" : "none",
      },
      paint: {
        ...(spec.paint ?? {}),
        ...(spec.type === "circle"
          ? {
              "circle-opacity":
                typeof (spec.paint as Record<string, unknown>)?.["circle-opacity"] === "number"
                  ? ((spec.paint as Record<string, number>)["circle-opacity"] ?? 1) * layerOpacity
                  : layerOpacity,
            }
          : {}),
      },
    })),
  };
}

export function appendGisProjectLayersToStyle(
  style: StyleSpecification,
  entries: GisLayerRuntimeEntry[],
): StyleSpecification {
  let next = style;
  for (const entry of entries) {
    const { source, layers } = buildLayerDefinitions(entry);
    next = {
      ...next,
      sources: {
        ...next.sources,
        [source.id]: source.spec,
      },
      layers: [...(next.layers ?? []), ...layers],
    };
  }
  return next;
}

export function syncGisProjectLayerData(
  map: MapLibreMap,
  entry: GisLayerRuntimeEntry,
): void {
  whenGisMapStyleReady(map, () => {
    const source = map.getSource(gisLayerSourceId(entry.layer.id)) as
      | import("maplibre-gl").GeoJSONSource
      | undefined;
    if (!source) return;
    source.setData(entry.geoJson ?? emptyGisOverlayGeoJson());
  });
}

export function syncGisProjectLayerStyle(
  map: MapLibreMap,
  entry: GisLayerRuntimeEntry,
): void {
  whenGisMapStyleReady(map, () => {
    const layerOpacity = entry.layer.opacity ?? 1;
    const visible = entry.layer.visible !== false ? "visible" : "none";
    const sourceId = gisLayerSourceId(entry.layer.id);

    if (entry.layer.kind === "heatmap") {
      const heatId = gisLayerHeatmapId(entry.layer.id);
      if (!map.getLayer(heatId)) return;
      map.setLayoutProperty(heatId, "visibility", visible);
      const resolved = resolveGisOverlayStyle(entry.layer.style, entry.options.chartColors);
      map.setPaintProperty(heatId, "heatmap-opacity", resolved.opacity * layerOpacity);
      return;
    }

    const resolved = resolveGisOverlayStyle(entry.layer.style, entry.options.chartColors);
    const circleId = `vs-gis-layer-${entry.layer.id}-circles`;
    const clusterId = `vs-gis-layer-${entry.layer.id}-clusters`;
    const labelId = `vs-gis-layer-${entry.layer.id}-labels`;
    for (const id of [circleId, clusterId, labelId]) {
      if (!map.getLayer(id)) continue;
      map.setLayoutProperty(id, "visibility", visible);
    }
    if (map.getLayer(circleId)) {
      const paint = buildGisOverlayCirclePaint(resolved);
      for (const [key, value] of Object.entries(paint)) {
        if (key === "circle-opacity" && typeof value === "number") {
          map.setPaintProperty(circleId, key, value * layerOpacity);
        } else {
          map.setPaintProperty(circleId, key, value);
        }
      }
    }
    if (map.getLayer(labelId)) {
      const labelLayout = buildGisOverlayLabelLayout(resolved);
      for (const [key, value] of Object.entries(labelLayout)) {
        map.setLayoutProperty(labelId, key, value);
      }
      map.setLayerZoomRange(labelId, resolved.labelMinZoom, 24);
      const labelPaint = buildGisOverlayLabelPaint(entry.options.flavor);
      for (const [key, value] of Object.entries(labelPaint)) {
        map.setPaintProperty(labelId, key, value);
      }
    }
    void sourceId;
  });
}

export function buildGisLayersStyleKey(entries: GisLayerRuntimeEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.layer.id,
      kind: entry.layer.kind,
      visible: entry.layer.visible !== false,
      opacity: entry.layer.opacity ?? 1,
      styleKey: buildGisOverlayStyleKey(entry.options),
    })),
  );
}

export function gisScatterInteractionLayerIds(layerId: string, cluster: boolean): string[] {
  const prefix = `vs-gis-layer-${layerId}`;
  return cluster
    ? [`${prefix}-clusters`, `${prefix}-circles`]
    : [`${prefix}-circles`];
}

export function syncGisProjectLayers(
  map: MapLibreMap,
  entries: GisLayerRuntimeEntry[],
): void {
  for (const entry of entries) {
    syncGisProjectLayerData(map, entry);
    syncGisProjectLayerStyle(map, entry);
  }
}

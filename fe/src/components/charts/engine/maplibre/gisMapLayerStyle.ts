import {
  buildScatterRadiusExpression,
  buildHeatmapDetailCirclePaint,
  buildHeatmapPaint,
  gisLayerHeatmapDetailId,
} from "@/components/charts/engine/maplibre/gisOverlayVisual";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { GisProjectLayer } from "@/components/charts/engine/maplibre/gisProject";
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

export { gisLayerHeatmapDetailId } from "@/components/charts/engine/maplibre/gisOverlayVisual";

export type GisLayerRuntimeEntry = {
  layer: GisProjectLayer;
  geoJson: GeoJSON.FeatureCollection | null;
  options: GisOverlayLayerOptions;
};

function buildHeatmapLayers(
  layerId: string,
  sourceId: string,
  resolved: ReturnType<typeof resolveGisOverlayStyle>,
  layerOpacity: number,
  chartColors?: string[],
  visible = true,
): LayerSpecification[] {
  const visibility = visible ? "visible" : "none";
  const accent = chartColors?.[0] ?? resolved.color;
  return [
    {
      id: gisLayerHeatmapId(layerId),
      type: "heatmap",
      source: sourceId,
      maxzoom: resolved.heatmapCrossfadeZoom + 1,
      layout: { visibility },
      paint: buildHeatmapPaint(resolved, layerOpacity, chartColors),
    },
    {
      id: gisLayerHeatmapDetailId(layerId),
      type: "circle",
      source: sourceId,
      minzoom: resolved.heatmapCrossfadeZoom - 0.5,
      layout: { visibility },
      paint: buildHeatmapDetailCirclePaint(resolved, layerOpacity, accent),
    },
  ];
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
      layers: buildHeatmapLayers(
        entry.layer.id,
        sourceId,
        resolved,
        layerOpacity,
        entry.options.chartColors,
        visible,
      ),
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
      const detailId = gisLayerHeatmapDetailId(entry.layer.id);
      const resolved = resolveGisOverlayStyle(entry.layer.style, entry.options.chartColors);
      for (const id of [heatId, detailId]) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(id, "visibility", visible);
      }
      if (map.getLayer(heatId)) {
        const paint = buildHeatmapPaint(resolved, layerOpacity, entry.options.chartColors);
        for (const [key, value] of Object.entries(paint)) {
          map.setPaintProperty(heatId, key, value);
        }
      }
      if (map.getLayer(detailId)) {
        const accent = entry.options.chartColors?.[0] ?? resolved.color;
        const paint = buildHeatmapDetailCirclePaint(resolved, layerOpacity, accent);
        for (const [key, value] of Object.entries(paint)) {
          map.setPaintProperty(detailId, key, value);
        }
      }
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

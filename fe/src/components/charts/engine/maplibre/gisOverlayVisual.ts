import type { ExpressionSpecification } from "maplibre-gl";
import type { ResolvedGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";

export type GisHeatmapPreset = "night" | "scientific";

const NIGHT_HEAT_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0, 0, 0, 0)",
  0.08,
  "rgba(56, 189, 248, 0)",
  0.25,
  "rgba(56, 189, 248, 0.35)",
  0.55,
  "rgba(251, 191, 36, 0.55)",
  0.82,
  "rgba(248, 113, 113, 0.72)",
  1,
  "rgba(239, 68, 68, 0.85)",
];

function scientificHeatColor(chartColors?: string[]): ExpressionSpecification {
  const c0 = chartColors?.[0] ?? "#3b82f6";
  const c1 = chartColors?.[1] ?? "#22d3ee";
  const c2 = chartColors?.[2] ?? "#fbbf24";
  const c3 = chartColors?.[3] ?? "#ef4444";
  return [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(0, 0, 0, 0)",
    0.15,
    c0,
    0.4,
    c1,
    0.65,
    c2,
    1,
    c3,
  ];
}

export function buildHeatmapColorExpression(
  preset: GisHeatmapPreset,
  chartColors?: string[],
): ExpressionSpecification {
  return preset === "scientific" ? scientificHeatColor(chartColors) : NIGHT_HEAT_COLOR;
}

function metricSizeInput(resolved: ResolvedGisOverlayStyle): ExpressionSpecification {
  const metric = ["coalesce", ["get", "sizeNorm"], 0.45] as ExpressionSpecification;
  if (resolved.sizeCurve === "linear") return metric;
  return ["sqrt", metric];
}

export function buildScatterRadiusExpression(resolved: ResolvedGisOverlayStyle): ExpressionSpecification {
  const metricRadius = [
    "interpolate",
    ["linear"],
    metricSizeInput(resolved),
    0,
    resolved.radiusMin,
    1,
    resolved.radiusMax,
  ] as ExpressionSpecification;

  if (!resolved.scaleByMetric) {
    const fixed = (resolved.radiusMin + resolved.radiusMax) / 2;
    return ["interpolate", ["linear"], ["zoom"], 2, fixed * 0.65, 8, fixed, 14, fixed * 1.15];
  }

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    2,
    ["interpolate", ["linear"], metricSizeInput(resolved), 0, resolved.radiusMin * 0.55, 1, resolved.radiusMax * 0.55],
    7,
    metricRadius,
    14,
    [
      "interpolate",
      ["linear"],
      metricSizeInput(resolved),
      0,
      resolved.radiusMin * 1.1,
      1,
      resolved.radiusMax * 1.35,
    ],
  ];
}

export function buildHeatmapWeightExpression(): ExpressionSpecification {
  return ["coalesce", ["get", "weightNorm"], ["coalesce", ["get", "sizeNorm"], 0.35]];
}

export function buildHeatmapPaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity: number,
  chartColors?: string[],
): Record<string, unknown> {
  const radiusMax = resolved.heatmapRadiusMax;
  const intensityBase = resolved.heatmapIntensity;
  const fadeZoom = resolved.heatmapCrossfadeZoom;
  return {
    "heatmap-weight": buildHeatmapWeightExpression(),
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      intensityBase * 1.25,
      6,
      intensityBase,
      fadeZoom,
      intensityBase * 0.45,
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      Math.max(2, radiusMax * 0.15),
      4,
      radiusMax * 0.45,
      8,
      radiusMax * 0.85,
      12,
      radiusMax,
    ],
    "heatmap-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      fadeZoom - 1,
      resolved.opacity * layerOpacity,
      fadeZoom + 1,
      0,
    ],
    "heatmap-color": buildHeatmapColorExpression(resolved.heatmapPreset, chartColors),
  };
}

export function buildHeatmapDetailCirclePaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity: number,
  accentColor: string,
): Record<string, unknown> {
  return {
    "circle-radius": buildScatterRadiusExpression({ ...resolved, scaleByMetric: true }),
    "circle-color": accentColor,
    "circle-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      resolved.heatmapCrossfadeZoom - 0.5,
      0,
      resolved.heatmapCrossfadeZoom,
      resolved.opacity * layerOpacity * 0.92,
    ],
    "circle-stroke-color": resolved.strokeColor,
    "circle-stroke-width": resolved.strokeWidth,
    "circle-blur": resolved.circleBlur,
  };
}

export function gisLayerHeatmapDetailId(layerId: string): string {
  return `vs-gis-layer-${layerId}-heat-points`;
}

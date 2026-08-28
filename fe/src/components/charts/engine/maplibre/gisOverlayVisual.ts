import type { ExpressionSpecification } from "maplibre-gl";
import type { GisBasemapFlavor, ResolvedGisOverlayStyle } from "@/components/charts/engine/maplibre/gisProject";

export type GisHeatmapPreset = "ember" | "night" | "scientific";

const EMBER_HEAT_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0, 0, 0, 0)",
  0.05,
  "rgba(0, 0, 0, 0)",
  0.18,
  "rgba(255, 100, 40, 0.10)",
  0.4,
  "rgba(255, 150, 50, 0.32)",
  0.65,
  "rgba(255, 190, 70, 0.52)",
  0.85,
  "rgba(255, 225, 120, 0.68)",
  1,
  "rgba(255, 248, 210, 0.78)",
];

const NIGHT_HEAT_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(0, 0, 0, 0)",
  0.1,
  "rgba(56, 189, 248, 0)",
  0.28,
  "rgba(56, 189, 248, 0.28)",
  0.55,
  "rgba(251, 191, 36, 0.48)",
  0.82,
  "rgba(248, 113, 113, 0.62)",
  1,
  "rgba(239, 68, 68, 0.75)",
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
  if (preset === "scientific") return scientificHeatColor(chartColors);
  if (preset === "night") return NIGHT_HEAT_COLOR;
  return EMBER_HEAT_COLOR;
}

function metricSizeInput(resolved: ResolvedGisOverlayStyle): ExpressionSpecification {
  const metric = ["coalesce", ["get", "sizeNorm"], 0.45] as ExpressionSpecification;
  if (resolved.sizeCurve === "linear") return metric;
  return ["sqrt", metric];
}

export function buildScatterRadiusExpression(
  resolved: ResolvedGisOverlayStyle,
  scale = 1,
): ExpressionSpecification {
  const metricRadius = [
    "interpolate",
    ["linear"],
    metricSizeInput(resolved),
    0,
    resolved.radiusMin * scale,
    1,
    resolved.radiusMax * scale,
  ] as ExpressionSpecification;

  if (!resolved.scaleByMetric) {
    const fixed = ((resolved.radiusMin + resolved.radiusMax) / 2) * scale;
    return ["interpolate", ["linear"], ["zoom"], 2, fixed * 0.65, 8, fixed, 14, fixed * 1.15];
  }

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    2,
    [
      "interpolate",
      ["linear"],
      metricSizeInput(resolved),
      0,
      resolved.radiusMin * 0.55 * scale,
      1,
      resolved.radiusMax * 0.55 * scale,
    ],
    7,
    metricRadius,
    14,
    [
      "interpolate",
      ["linear"],
      metricSizeInput(resolved),
      0,
      resolved.radiusMin * 1.1 * scale,
      1,
      resolved.radiusMax * 1.35 * scale,
    ],
  ];
}

export function buildMetricColorExpression(
  resolved: ResolvedGisOverlayStyle,
  chartColors?: string[],
): string | ExpressionSpecification {
  if (resolved.colorByCategory) {
    return ["coalesce", ["get", "color"], resolved.color];
  }
  if (resolved.scaleByMetric) {
    const low = chartColors?.[1] ?? "rgba(34, 211, 238, 0.88)";
    const mid = chartColors?.[2] ?? "rgba(251, 191, 36, 0.92)";
    const high = chartColors?.[3] ?? chartColors?.[0] ?? "rgba(244, 63, 94, 0.95)";
    return [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "sizeNorm"], 0.45],
      0,
      low,
      0.45,
      mid,
      1,
      high,
    ];
  }
  return resolved.color;
}

export function buildScatterOpacityExpression(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity = 1,
): ExpressionSpecification | number {
  const base = resolved.opacity * layerOpacity;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    2,
    base * 0.4,
    5,
    base * 0.75,
    8,
    base,
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
      intensityBase * 1.3,
      6,
      intensityBase,
      fadeZoom,
      intensityBase * 0.4,
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      Math.max(2, radiusMax * 0.18),
      4,
      radiusMax * 0.5,
      8,
      radiusMax * 0.88,
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

export function buildHeatmapGlowPaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity: number,
  chartColors?: string[],
): Record<string, unknown> {
  const fade = resolved.heatmapCrossfadeZoom;
  const accent = chartColors?.[0] ?? resolved.color;
  return {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "weightNorm"], ["get", "sizeNorm"], 0.4],
      0,
      5,
      0.5,
      16,
      1,
      28,
    ],
    "circle-color": accent,
    "circle-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      resolved.opacity * layerOpacity * 0.28,
      fade - 1.5,
      resolved.opacity * layerOpacity * 0.12,
      fade,
      0,
    ],
    "circle-blur": 0.9,
    "circle-stroke-width": 0,
  };
}

export function buildHeatmapDetailCirclePaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity: number,
  chartColors?: string[],
): Record<string, unknown> {
  const metricResolved = { ...resolved, scaleByMetric: true, colorByCategory: false };
  return {
    "circle-radius": buildScatterRadiusExpression(metricResolved),
    "circle-color": buildMetricColorExpression(metricResolved, chartColors),
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
    "circle-blur": resolved.circleBlur * 0.35,
  };
}

export function buildScatterGlowPaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity = 1,
  chartColors?: string[],
): Record<string, unknown> {
  const glow = resolved.glowStrength;
  const base = resolved.opacity * layerOpacity;
  return {
    "circle-radius": buildScatterRadiusExpression(resolved, 2.15),
    "circle-color": buildMetricColorExpression(resolved, chartColors),
    "circle-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      base * glow * 0.32,
      5,
      base * glow * 0.48,
      8,
      base * glow * 0.55,
    ],
    "circle-blur": 0.68,
    "circle-stroke-width": 0,
  };
}

export function buildScatterCorePaint(
  resolved: ResolvedGisOverlayStyle,
  layerOpacity = 1,
  chartColors?: string[],
  flavor?: GisBasemapFlavor,
): Record<string, unknown> {
  const lightBasemap = !flavor || flavor === "light" || flavor === "white" || flavor === "grayscale";
  const strokeColor = lightBasemap ? "rgba(255, 255, 255, 0.95)" : resolved.strokeColor;
  const strokeWidth = lightBasemap ? Math.min(resolved.strokeWidth, 0.65) : resolved.strokeWidth;
  return {
    "circle-radius": buildScatterRadiusExpression(resolved),
    "circle-color": buildMetricColorExpression(resolved, chartColors),
    "circle-opacity": buildScatterOpacityExpression(resolved, layerOpacity),
    "circle-stroke-color": strokeColor,
    "circle-stroke-width": strokeWidth,
    "circle-stroke-opacity": 0.88,
    "circle-blur": resolved.circleBlur * 0.2,
  };
}

export function buildClusterGlowPaint(
  resolved: ResolvedGisOverlayStyle,
  chartColors?: string[],
): Record<string, unknown> {
  const accent = chartColors?.[0] ?? resolved.color;
  return {
    "circle-color": accent,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18,
      10,
      22,
      50,
      28,
      200,
      34,
    ],
    "circle-opacity": resolved.opacity * 0.22,
    "circle-blur": 0.72,
    "circle-stroke-width": 0,
  };
}

export function buildClusterCirclePaint(
  resolved: ResolvedGisOverlayStyle,
  chartColors?: string[],
): Record<string, unknown> {
  const accent = chartColors?.[0] ?? resolved.color;
  const warm = chartColors?.[2] ?? "#f59e0b";
  const hot = chartColors?.[3] ?? "#e11d48";
  return {
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "point_count"],
      2,
      accent,
      24,
      warm,
      100,
      hot,
    ],
    "circle-opacity": resolved.opacity * 0.94,
    "circle-stroke-color": "rgba(255, 255, 255, 0.92)",
    "circle-stroke-width": 1.5,
    "circle-stroke-opacity": 0.96,
    "circle-blur": 0.08,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      14,
      10,
      18,
      50,
      24,
      200,
      30,
    ],
  };
}

export function buildClusterCountLayout(): Record<string, unknown> {
  return {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": ["step", ["get", "point_count"], 12, 20, 13, 100, 14],
    "text-allow-overlap": true,
    "text-font": ["Noto Sans Bold"],
  };
}

export function buildClusterCountPaint(): Record<string, unknown> {
  return {
    "text-color": "#ffffff",
    "text-halo-color": "rgba(0, 0, 0, 0.28)",
    "text-halo-width": 0.85,
    "text-opacity": 1,
  };
}

export function gisLayerHeatmapDetailId(layerId: string): string {
  return `vs-gis-layer-${layerId}-heat-points`;
}

export function gisLayerHeatmapGlowId(layerId: string): string {
  return `vs-gis-layer-${layerId}-heat-glow`;
}

export function gisLayerScatterGlowId(layerId: string): string {
  return `vs-gis-layer-${layerId}-glow`;
}

export function gisLayerClusterGlowId(layerId: string): string {
  return `vs-gis-layer-${layerId}-cluster-glow`;
}

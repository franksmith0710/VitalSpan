import type { GeoPath } from "d3";

type GeoFeatureRow = { name: string; geometry: GeoJSON.Geometry };

/** 按区域面积与视口自适应标注密度，避免区县级过密 */
export function pickChoroplethLabelFeatures(
  features: GeoFeatureRow[],
  pathGen: GeoPath,
  innerW: number,
  innerH: number,
): GeoFeatureRow[] {
  if (features.length <= 8) return features;

  const viewportArea = Math.max(innerW * innerH, 1);
  const areaFloor = (viewportArea / features.length) * 0.06;
  const maxLabels =
    features.length > 40 ? 14 : features.length > 24 ? 22 : Math.min(34, Math.ceil(features.length * 0.62));

  const ranked = features
    .map((feature) => ({
      feature,
      area:
        pathGen.area({ type: "Feature", properties: {}, geometry: feature.geometry }) ?? 0,
    }))
    .filter((row) => row.area >= areaFloor)
    .sort((a, b) => b.area - a.area);

  return ranked.slice(0, maxLabels).map((row) => row.feature);
}

export function resolveChoroplethLabelFontSize(featureCount: number, innerW: number): number {
  if (featureCount > 28) return 7;
  if (featureCount > 18) return 8;
  if (innerW < 300) return 8;
  return 9;
}

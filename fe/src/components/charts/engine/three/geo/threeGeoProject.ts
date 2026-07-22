import * as d3 from "d3";
import {
  chinaGeoLayoutCenterInViewport,
  fitChinaGeoProjection,
  isDecorativeGeoFeature,
} from "@/components/charts/engine/geo/geoProjection";
import {
  computeGeoProjBounds,
  type GeoMapLayoutMargin,
  type GeoProjBounds,
} from "@/components/charts/engine/three/geo/applyGeoTerrainSurface";

export const THREE_GEO_MAP_MARGIN: GeoMapLayoutMargin = {
  top: 8,
  right: 12,
  bottom: 24,
  left: 12,
};

export type ThreeGeoProjectContext = {
  projection: d3.GeoProjection;
  project: (coord: [number, number]) => [number, number] | null;
  projBounds: GeoProjBounds;
  margin: GeoMapLayoutMargin;
  centerX: number;
  centerY: number;
  layoutCenterX: number;
  layoutCenterY: number;
  viewport: { width: number; height: number };
};

export function buildMapFitCollection(
  geo: { features?: Array<{ properties?: { adcode?: number | string; adchar?: string; name?: string }; geometry?: GeoJSON.Geometry | null }> },
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (geo.features ?? [])
      .filter((f) => !isDecorativeGeoFeature(f.properties) && f.geometry != null)
      .map((f) => ({
        type: "Feature" as const,
        properties: { name: f.properties?.name ?? "" },
        geometry: f.geometry!,
      })),
  };
}

/** 与 D3 choropleth 同投影，并将 layoutCenter 对齐 Three 原点（避免中轴偏移） */
export function buildThreeGeoProject(
  width: number,
  height: number,
  boundsFeatures: Array<{ geometry: GeoJSON.Geometry | null }>,
  fitCollection: GeoJSON.FeatureCollection,
): ThreeGeoProjectContext {
  const margin = THREE_GEO_MAP_MARGIN;
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const projection = fitChinaGeoProjection(d3.geoMercator(), innerW, innerH, fitCollection);
  const { centerX: layoutCenterX, centerY: layoutCenterY } = chinaGeoLayoutCenterInViewport(
    width,
    height,
    margin,
  );

  const projectRaw = (coord: [number, number]): [number, number] | null => {
    const p = projection(coord);
    if (!p) return null;
    return [p[0] + margin.left - width / 2, -(p[1] + margin.top - height / 2)];
  };

  const rawBounds = computeGeoProjBounds(boundsFeatures, projectRaw);
  const centerX = (rawBounds.minX + rawBounds.maxX) / 2;
  const centerY = (rawBounds.minY + rawBounds.maxY) / 2;

  const project = (coord: [number, number]): [number, number] | null => {
    const p = projectRaw(coord);
    if (!p) return null;
    return [p[0] - centerX, p[1] - centerY];
  };

  return {
    projection,
    project,
    projBounds: computeGeoProjBounds(boundsFeatures, project),
    margin,
    centerX,
    centerY,
    layoutCenterX,
    layoutCenterY,
    viewport: { width, height },
  };
}

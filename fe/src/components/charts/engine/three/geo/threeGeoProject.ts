import * as d3 from "d3";
import { fitChinaGeoProjection } from "@/components/charts/engine/geo/geoProjection";
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
  viewport: { width: number; height: number };
};

/** 与 D3 choropleth 同投影；几何居中交给 layoutThreeGeoMapGroup */
export function buildThreeGeoProject(
  width: number,
  height: number,
  features: Array<{ geometry: GeoJSON.Geometry | null }>,
  fitCollection: GeoJSON.FeatureCollection,
): ThreeGeoProjectContext {
  const margin = THREE_GEO_MAP_MARGIN;
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const projection = fitChinaGeoProjection(d3.geoMercator(), innerW, innerH, fitCollection);

  const project = (coord: [number, number]): [number, number] | null => {
    const p = projection(coord);
    if (!p) return null;
    return [p[0] + margin.left - width / 2, -(p[1] + margin.top - height / 2)];
  };

  return {
    projection,
    project,
    projBounds: computeGeoProjBounds(features, project),
    margin,
    centerX: 0,
    centerY: 0,
    viewport: { width, height },
  };
}

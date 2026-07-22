import * as d3 from "d3";

/** 对标 ECharts map series layoutSize / layoutCenter */
const LAYOUT_SIZE = 0.92;
const LAYOUT_CENTER_Y = 0.52;

export type GeoFeatureProperties = {
  adcode?: number | string;
  adchar?: string;
  name?: string;
};

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";
}

function isLinearRing(value: unknown): value is number[][] {
  return Array.isArray(value) && value.length > 0 && isCoordinatePair(value[0]);
}

/** china-provinces.json 部分 MultiPolygon 多包一层环，导致 d3 画出整屏裁剪矩形 */
function unwrapGeoRing(ring: number[][]): number[][] {
  if (ring.length === 1 && isLinearRing(ring[0])) return ring[0];
  return ring;
}

function normalizePolygonRings(rings: number[][][]): number[][][] {
  return rings.map((ring) => unwrapGeoRing(ring));
}

/** 将畸形 MultiPolygon 转为 d3 可消费的 Polygon / MultiPolygon */
export function normalizeOfflineGeoGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: normalizePolygonRings(geometry.coordinates) };
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.map((polygon) => normalizePolygonRings(polygon));
    if (polygons.length === 1) {
      return { type: "Polygon", coordinates: polygons[0] };
    }
    return { type: "MultiPolygon", coordinates: polygons };
  }
  return geometry;
}

function signedRingArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[j];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum;
}

function rewindRingForSvg(ring: number[][], isOuter: boolean): number[][] {
  const clockwise = signedRingArea(ring) > 0;
  if (clockwise === isOuter) return [...ring].reverse();
  return ring;
}

function rewindGeometryForSvg(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring, index) => rewindRingForSvg(ring, index === 0)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring, index) => rewindRingForSvg(ring, index === 0)),
      ),
    };
  }
  return geometry;
}

/** 离线省级 GeoJSON 进入渲染管线前的标准几何 */
export function prepareOfflineGeoGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  return rewindGeometryForSvg(normalizeOfflineGeoGeometry(geometry));
}

/** 九段线等装饰要素，不参与填色与交互 */
export function isDecorativeGeoFeature(properties?: GeoFeatureProperties): boolean {
  const adcode = properties?.adcode;
  if (typeof adcode === "string" && adcode.includes("_JD")) return true;
  return properties?.adchar === "JD";
}

export function fitChinaGeoProjection(
  projection: d3.GeoProjection,
  width: number,
  height: number,
  collection: GeoJSON.FeatureCollection,
): d3.GeoProjection {
  const layoutW = width * LAYOUT_SIZE;
  const layoutH = height * LAYOUT_SIZE;
  const left = (width - layoutW) / 2;
  const top = height * LAYOUT_CENTER_Y - layoutH / 2;
  return projection.fitExtent(
    [
      [left, top],
      [left + layoutW, top + layoutH],
    ],
    collection,
  );
}

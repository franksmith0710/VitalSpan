import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import {
  analyzeGeoMapMatch,
  resolveMapRegionName,
} from "@/components/charts/engine/echarts/geo/geoMapChart";
import {
  DEFAULT_GEO_HEATMAP_PLACEHOLDER_HINT,
  DEFAULT_GEO_MAP_PLACEHOLDER_HINT,
  MAP_REGION_NAME_HINT,
  resolveEmbeddedGeoRoam,
  VS_REGIONS_MAP_ID,
} from "@/components/charts/engine/geo/geoConstants";
import type {
  GeoEnginePort,
  GeoHeatmapBuildInput,
  GeoMapBuildInput,
  GeoPlaceholderInput,
} from "@/components/charts/engine/geoEnginePort";
import { formatChartValue } from "@/lib/chartValueFormat";

type RegionsGeo = { features?: Array<{ properties?: { name?: string; adcode?: number }; geometry?: unknown }> };

const registeredMaps = new Map<string, RegionsGeo>();

function ensureDefaultMapRegistered(): void {
  if (!registeredMaps.has(VS_REGIONS_MAP_ID)) {
    registeredMaps.set(VS_REGIONS_MAP_ID, chinaProvincesGeo as RegionsGeo);
  }
}

export function registerOfflineGeoMap(mapId: string, geo: RegionsGeo): void {
  registeredMaps.set(mapId, geo);
}

export function getOfflineGeoMap(mapId: string): RegionsGeo | undefined {
  ensureDefaultMapRegistered();
  return registeredMaps.get(mapId);
}

function joinMapRows(
  rows: unknown[][],
  columns: string[],
  regionField: string,
  metricField: string,
  mapId: string,
  knownRegionNames?: string[],
): Array<{ name: string; value: number; adcode?: number }> {
  ensureDefaultMapRegistered();
  const ri = columns.indexOf(regionField);
  const mi = columns.indexOf(metricField);
  const geo = registeredMaps.get(mapId) ?? (chinaProvincesGeo as RegionsGeo);
  const valueByName = new Map<string, number>();
  if (ri >= 0 && mi >= 0) {
    for (const row of rows) {
      const raw = String(row[ri] ?? "");
      const resolved = resolveMapRegionName(raw, knownRegionNames);
      const key = resolved.matched ? resolved.name : raw;
      valueByName.set(key, Number(row[mi] ?? 0));
    }
  }
  return (geo.features ?? []).map((f) => {
    const name = f.properties?.name ?? "";
    return {
      name,
      value: valueByName.get(name) ?? 0,
      adcode: f.properties?.adcode,
      geometry: f.geometry,
    };
  });
}

export const antvGeoEngine: GeoEnginePort = {
  mapId: VS_REGIONS_MAP_ID,
  buildMapOption(input: GeoMapBuildInput) {
    const mapId = input.mapId ?? VS_REGIONS_MAP_ID;
    const features = joinMapRows(
      input.rows,
      input.columns,
      input.regionField,
      input.metricField,
      mapId,
      input.knownRegionNames,
    );
    return {
      mapId,
      features,
      showLabel: input.showLabel,
      geo: input.geo,
      valueFormat: input.valueFormat,
    };
  },
  buildMapPlaceholder(input?: GeoPlaceholderInput) {
    return {
      __vsGeoMapPlaceholder: true,
      mapId: VS_REGIONS_MAP_ID,
      roam: input?.roam ?? resolveEmbeddedGeoRoam(input?.geo?.roam),
      isDark: input?.isDark,
    };
  },
  buildHeatmapOption(input: GeoHeatmapBuildInput) {
    const xi = input.columns.indexOf(input.xField);
    const yi = input.columns.indexOf(input.yField);
    const mi = input.columns.indexOf(input.metricField);
    const cells = input.rows.map((row) => ({
      x: String(row[xi] ?? ""),
      y: String(row[yi] ?? ""),
      value: Number(row[mi] ?? 0),
    }));
    return { cells, geo: input.geo, valueFormat: input.valueFormat };
  },
  buildHeatmapPlaceholder(input?: GeoPlaceholderInput) {
    return { __vsGeoHeatmapPlaceholder: true, isDark: input?.isDark };
  },
  isMapPlaceholder(option: Record<string, unknown>) {
    return option.__vsGeoMapPlaceholder === true;
  },
  isHeatmapPlaceholder(option: Record<string, unknown>) {
    return option.__vsGeoHeatmapPlaceholder === true;
  },
  analyzeMatch(rows, columns, regionField, knownRegionNames, rootLevel) {
    return analyzeGeoMapMatch(rows, columns, regionField, knownRegionNames, rootLevel);
  },
  resolveEmbeddedRoam: resolveEmbeddedGeoRoam,
};

export function formatGeoTooltipValue(
  value: number,
  valueFormat?: NumberFormatConfig,
): string {
  return formatChartValue(value, valueFormat);
}

export {
  DEFAULT_GEO_MAP_PLACEHOLDER_HINT,
  DEFAULT_GEO_HEATMAP_PLACEHOLDER_HINT,
  MAP_REGION_NAME_HINT,
  VS_REGIONS_MAP_ID,
};

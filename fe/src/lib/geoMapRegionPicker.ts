import type { ChartDrillFrame } from "@/lib/chartDrill";
import { getDrillChain } from "@/lib/chartDrill";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  isMunicipalityAdcode,
  lookupCityAdcode,
  lookupProvinceAdcode,
  resolveGeoMapLevelContext,
} from "@/components/charts/engine/geo/geoMapLevels";

export type GeoMapRegionSelection = {
  province: string;
  city?: string;
  district?: string;
};

export function formatGeoMapRegionSelectionLabel(
  selection: GeoMapRegionSelection | null,
  emptyLabel = "全国",
): string {
  if (!selection?.province) return emptyLabel;
  if (selection.district) return selection.district;
  if (selection.city) return selection.city;
  return selection.province;
}

export function parseGeoMapDrillStackSelection(
  stack: ChartDrillFrame[],
): GeoMapRegionSelection | null {
  if (!stack.length) return null;
  const province = stack[0].label?.trim() || stack[0].value;
  if (stack.length === 1) return { province };

  const provinceAdcode = lookupProvinceAdcode(province);
  const municipality = provinceAdcode ? isMunicipalityAdcode(provinceAdcode) : false;
  const second = stack[1].label?.trim() || stack[1].value;

  if (stack.length >= 2 && municipality) {
    return { province, district: second };
  }

  const third = stack[2]?.label?.trim() || stack[2]?.value;
  return {
    province,
    city: second,
    district: third,
  };
}

export function buildGeoMapDrillStackFromSelection(
  config: ChartViewConfig,
  selection: GeoMapRegionSelection | null,
): ChartDrillFrame[] {
  if (!selection?.province) return [];
  const chain = resolveGeoMapDrillChain(config);
  if (!chain.length) return [];

  const frames: ChartDrillFrame[] = [
    {
      field: chain[0] ?? "province",
      value: selection.province,
      label: selection.province,
    },
  ];

  const provinceAdcode = lookupProvinceAdcode(selection.province);
  const municipality = provinceAdcode ? isMunicipalityAdcode(provinceAdcode) : false;

  if (selection.district && municipality && chain.length >= 3) {
    frames.push({
      field: chain[2] ?? "district",
      value: selection.district,
      label: selection.district,
    });
    return frames;
  }

  if (selection.city && chain.length >= 2) {
    frames.push({
      field: chain[1] ?? "city",
      value: selection.city,
      label: selection.city,
    });
  }

  if (selection.district && !municipality && chain.length >= 3) {
    frames.push({
      field: chain[2] ?? "district",
      value: selection.district,
      label: selection.district,
    });
  }

  return frames;
}

const DEFAULT_GEO_DRILL_CHAIN = ["province", "city", "district"] as const;

/** 无槽位时使用默认省/市/区县字段名，仍允许手动切换地图层级 */
export function resolveGeoMapDrillChain(config: ChartViewConfig): string[] {
  const chain = getDrillChain(config);
  if (chain.length) return chain;
  return [...DEFAULT_GEO_DRILL_CHAIN];
}

export function geoMapRegionMaxDepth(config: ChartViewConfig): number {
  const chain = resolveGeoMapDrillChain(config);
  if (!chain.length) return 0;
  return Math.max(1, Math.min(chain.length - 1, 2));
}

export type ManualGeoMapDrillResult =
  | { ok: true }
  | { ok: false; message: string };

export async function validateManualGeoMapDrillStack(
  config: ChartViewConfig,
  stack: ChartDrillFrame[],
): Promise<ManualGeoMapDrillResult> {
  const context = await resolveGeoMapLevelContext({ config, drillStack: stack });
  if (context.missingAsset) {
    return { ok: false, message: context.missingAsset };
  }
  if (context.drillDepth !== stack.length) {
    return { ok: false, message: "无法下钻到该层级，请检查地理字段与离线边界资产" };
  }
  return { ok: true };
}

export async function resolveGeoMapCityAdcode(
  provinceName: string,
  cityName: string,
): Promise<number | null> {
  const provinceAdcode = lookupProvinceAdcode(provinceName);
  if (!provinceAdcode) return null;
  return lookupCityAdcode(cityName, provinceAdcode);
}

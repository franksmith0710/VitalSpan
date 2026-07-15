import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import { chartPalette } from "@/lib/chartPalette";
import * as echarts from "echarts";

/** GEO-IRON-01：仅离线中国省级 GeoJSON；禁止在线瓦片/境外底图。见 `.cursor/rules/geo-map-offline-china.mdc` */

export const VS_REGIONS_MAP_ID = "vs-regions";

/** buildGeoMapPlaceholderEchartsOption 在 option 上打的标记 */
export const VS_GEO_MAP_PLACEHOLDER_FLAG = "__vsGeoMapPlaceholder";

export const DEFAULT_GEO_MAP_PLACEHOLDER_HINT = "请拖入地理维度与指标";

/** 画布底部短提示：region_id 不能作为地理维度 */
export const MAP_REGION_NAME_HINT = "地理维度请使用省/市名称（如 regions.name）";

export function isNumericRegionIdDimension(
  regionField: string,
  columns: string[],
  rows: unknown[][],
): boolean {
  if (!/region[_-]?id$/i.test(regionField)) return false;
  const colIdx = columns.indexOf(regionField);
  if (colIdx < 0 || rows.length === 0) return false;
  const sample = rows[0]?.[colIdx];
  if (typeof sample === "number") return true;
  if (typeof sample === "string") {
    const trimmed = sample.trim();
    return trimmed !== "" && !Number.isNaN(Number(trimmed));
  }
  return false;
}

export type GeoChartStyle = {
  /** 地图缩放/平移（对标 DE 地图交互） */
  roam?: boolean;
  /** 区域名称标签 */
  showRegionLabel?: boolean;
  /** 数值映射色带（地图/热力） */
  visualMap?: boolean;
};

export const DEFAULT_GEO_CHART_STYLE: Required<GeoChartStyle> = {
  roam: true,
  showRegionLabel: false,
  visualMap: true,
};

type GeoFeatureProps = {
  name?: string;
  adcode?: number;
  level?: string;
};
type GeoJsonFeature = { properties?: GeoFeatureProps };
type RegionsGeo = { features?: GeoJsonFeature[] };

/** 演示库 regions.code → 省级全称（docker/demo-mysql） */
const REGION_CODE_ALIASES: Record<string, string> = {
  SH: "上海市",
  BJ: "北京市",
  GD: "广东省",
  JS: "江苏省",
  SC: "四川省",
  ZJ: "浙江省",
  SD: "山东省",
  HN: "河南省",
  HB: "湖北省",
  FJ: "福建省",
};

const REGION_SUFFIX_RE =
  /(?:特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市)$/u;

let mapRegistered = false;
let provinceFullNames: string[] | null = null;
let adcodeToFullName: Map<number, string> | null = null;
let shortToFullName: Map<string, string> | null = null;

function getProvinceIndex() {
  if (provinceFullNames && adcodeToFullName && shortToFullName) {
    return { provinceFullNames, adcodeToFullName, shortToFullName };
  }

  const geo = chinaProvincesGeo as RegionsGeo;
  const features = (geo.features ?? []).filter(
    (feature) => feature.properties?.level === "province" && feature.properties.name,
  );

  const fullNames: string[] = [];
  const adcodeMap = new Map<number, string>();
  const shortMap = new Map<string, string>();

  for (const feature of features) {
    const fullName = feature.properties!.name!.trim();
    fullNames.push(fullName);
    if (typeof feature.properties?.adcode === "number") {
      adcodeMap.set(feature.properties.adcode, fullName);
    }
    const shortName = fullName.replace(REGION_SUFFIX_RE, "");
    if (shortName && shortName !== fullName) {
      shortMap.set(shortName, fullName);
    }
    shortMap.set(fullName, fullName);
  }

  provinceFullNames = fullNames;
  adcodeToFullName = adcodeMap;
  shortToFullName = shortMap;
  return { provinceFullNames: fullNames, adcodeToFullName: adcodeMap, shortToFullName: shortMap };
}

export function ensureVsRegionsMapRegistered(): void {
  if (mapRegistered) return;
  echarts.registerMap(VS_REGIONS_MAP_ID, chinaProvincesGeo as never);
  mapRegistered = true;
}

export function listVsRegionNames(): string[] {
  return [...getProvinceIndex().provinceFullNames];
}

/** @deprecated 使用 resolveMapRegionName */
export function normalizeRegionName(raw: string, knownNames = listVsRegionNames()): string {
  return resolveMapRegionName(raw, knownNames).name;
}

export type GeoMapRegionResolve = {
  name: string;
  matched: boolean;
};

function resolveAdcodeName(raw: string, adcodeMap: Map<number, string>): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const code = Number(digits);
  if (!Number.isFinite(code)) return null;

  if (adcodeMap.has(code)) return adcodeMap.get(code)!;

  const provinceCode = Math.floor(code / 10000) * 10000;
  if (provinceCode >= 110000 && adcodeMap.has(provinceCode)) {
    return adcodeMap.get(provinceCode)!;
  }

  if (code > 0 && code < 100) {
    const padded = code * 10000;
    if (adcodeMap.has(padded)) return adcodeMap.get(padded)!;
  }

  return null;
}

/** 将业务维度值解析为底图省级 properties.name */
export function resolveMapRegionName(
  raw: unknown,
  knownNames = listVsRegionNames(),
): GeoMapRegionResolve {
  const { adcodeToFullName: adcodeMap, shortToFullName: shortMap } = getProvinceIndex();
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { name: "", matched: false };

  if (knownNames.includes(trimmed)) return { name: trimmed, matched: true };

  const alias = REGION_CODE_ALIASES[trimmed.toUpperCase()];
  if (alias && knownNames.includes(alias)) return { name: alias, matched: true };

  const fromAdcode = resolveAdcodeName(trimmed, adcodeMap);
  if (fromAdcode) return { name: fromAdcode, matched: true };

  if (shortMap.has(trimmed)) {
    const full = shortMap.get(trimmed)!;
    return { name: full, matched: knownNames.includes(full) };
  }

  const stripped = trimmed.replace(REGION_SUFFIX_RE, "");
  if (shortMap.has(stripped)) {
    const full = shortMap.get(stripped)!;
    return { name: full, matched: knownNames.includes(full) };
  }

  const byPrefix = knownNames.find(
    (name) => trimmed.startsWith(name) || stripped.startsWith(name.replace(REGION_SUFFIX_RE, "")),
  );
  if (byPrefix) return { name: byPrefix, matched: true };

  return { name: stripped || trimmed, matched: false };
}

export type GeoMapMatchStats = {
  total: number;
  matched: number;
  unmatched: string[];
};

export function analyzeGeoMapMatch(
  rows: unknown[][],
  columns: string[],
  regionField: string,
): GeoMapMatchStats {
  const knownNames = listVsRegionNames();
  const ri = columns.indexOf(regionField);
  const unmatched = new Set<string>();
  let matched = 0;

  for (const row of rows) {
    const resolved = resolveMapRegionName(row[ri], knownNames);
    if (resolved.matched) matched += 1;
    else if (resolved.name) unmatched.add(String(row[ri] ?? ""));
  }

  return {
    total: rows.length,
    matched,
    unmatched: [...unmatched].slice(0, 5),
  };
}

export type GeoMapPlaceholderInput = {
  geo?: GeoChartStyle;
  isDark?: boolean;
  /** 是否允许缩放平移（未配置占位默认关闭） */
  roam?: boolean;
};

/** 对标 DataEase：无数据/未绑字段时仍展示中国省级轮廓底图 */
export function buildGeoMapPlaceholderEchartsOption(
  input: GeoMapPlaceholderInput = {},
): Record<string, unknown> {
  ensureVsRegionsMapRegistered();
  const isDark = input.isDark ?? false;
  const baseFill = isDark ? "#334155" : "#e8edf3";
  const emphasisFill = isDark ? "#475569" : "#d4dce6";
  const borderColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.55)";

  return {
    [VS_GEO_MAP_PLACEHOLDER_FLAG]: true,
    tooltip: {
      trigger: "item",
      formatter: (params: { name?: string }) => params.name ?? "",
    },
    series: [
      {
        type: "map",
        map: VS_REGIONS_MAP_ID,
        roam: input.roam ?? false,
        layoutCenter: ["50%", "52%"],
        layoutSize: "92%",
        label: { show: false },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: emphasisFill },
        },
        itemStyle: {
          areaColor: baseFill,
          borderColor,
          borderWidth: 0.8,
        },
        data: [],
      },
    ],
  };
}

export function isGeoMapPlaceholderOption(option: Record<string, unknown> | null | undefined): boolean {
  return Boolean(option?.[VS_GEO_MAP_PLACEHOLDER_FLAG]);
}

export type GeoMapRowsInput = {
  rows: unknown[][];
  columns: string[];
  regionField: string;
  metricField: string;
  geo?: GeoChartStyle;
  showLabel?: boolean;
};

export function buildGeoMapEchartsOption(input: GeoMapRowsInput): Record<string, unknown> {
  ensureVsRegionsMapRegistered();
  const knownNames = listVsRegionNames();
  const ri = input.columns.indexOf(input.regionField);
  const mi = input.columns.indexOf(input.metricField);
  const geo = { ...DEFAULT_GEO_CHART_STYLE, ...input.geo };
  const showLabel = input.showLabel ?? geo.showRegionLabel;

  const data = input.rows.map((row) => {
    const resolved = resolveMapRegionName(row[ri], knownNames);
    return {
      name: resolved.name,
      value: Number(row[mi] ?? 0),
    };
  });
  const values = data.map((item) => item.value);
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values, 0) : 0;

  const option: Record<string, unknown> = {
    tooltip: {
      trigger: "item",
      formatter: (params: { name?: string; value?: number }) =>
        `${params.name ?? ""}: ${params.value ?? 0}`,
    },
    series: [
      {
        type: "map",
        map: VS_REGIONS_MAP_ID,
        roam: geo.roam,
        layoutCenter: ["50%", "52%"],
        layoutSize: "92%",
        label: { show: showLabel, fontSize: 11 },
        emphasis: {
          label: { show: true },
          itemStyle: { areaColor: chartPalette.brand },
        },
        itemStyle: {
          borderColor: "rgba(148, 163, 184, 0.45)",
          borderWidth: 0.6,
          areaColor: "#f1f5f9",
        },
        data,
      },
    ],
  };

  if (geo.visualMap) {
    option.visualMap = {
      min,
      max: max === min ? min + 1 : max,
      left: 16,
      bottom: 16,
      calculable: true,
      text: ["高", "低"],
      inRange: { color: ["#e0f2fe", chartPalette.info, chartPalette.brand] },
      textStyle: { fontSize: 11 },
    };
  }

  return option;
}

export type GeoHeatmapRowsInput = {
  rows: unknown[][];
  columns: string[];
  xField: string;
  yField: string;
  metricField: string;
  geo?: GeoChartStyle;
};

export function buildGeoHeatmapEchartsOption(input: GeoHeatmapRowsInput): Record<string, unknown> {
  if (input.rows.length === 0) return { series: [] };

  const xi = input.columns.indexOf(input.xField);
  const yi = input.columns.indexOf(input.yField);
  const mi = input.columns.indexOf(input.metricField);
  const geo = { ...DEFAULT_GEO_CHART_STYLE, ...input.geo };

  const xCats = [...new Set(input.rows.map((row) => String(row[xi] ?? "")))];
  const yCats = [...new Set(input.rows.map((row) => String(row[yi] ?? "")))];
  const data = input.rows.map((row) => [
    xCats.indexOf(String(row[xi] ?? "")),
    yCats.indexOf(String(row[yi] ?? "")),
    Number(row[mi] ?? 0),
  ]);
  const values = data.map((item) => Number(item[2]));
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values, 0) : 0;

  const option: Record<string, unknown> = {
    tooltip: {
      position: "top",
      formatter: (params: { data?: [number, number, number] }) => {
        const tuple = params.data;
        if (!tuple) return "";
        const [xIndex, yIndex, value] = tuple;
        return `${xCats[xIndex] ?? ""} × ${yCats[yIndex] ?? ""}: ${value}`;
      },
    },
    grid: { containLabel: true, left: 48, right: 24, top: 24, bottom: geo.visualMap ? 56 : 24 },
    xAxis: { type: "category", data: xCats, splitArea: { show: true } },
    yAxis: { type: "category", data: yCats, splitArea: { show: true } },
    series: [
      {
        type: "heatmap",
        data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.2)" } },
      },
    ],
  };

  if (geo.visualMap) {
    option.visualMap = {
      min,
      max: max === min ? min + 1 : max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 8,
      inRange: { color: ["#f0f9ff", chartPalette.info, chartPalette.brand] },
    };
  }

  return option;
}

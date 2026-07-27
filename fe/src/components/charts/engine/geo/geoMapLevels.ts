import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { getOfflineGeoMap, registerOfflineGeoMap } from "@/components/charts/engine/geo/OfflineGeoPort";
import chinaProvincesGeo from "@/assets/geo/china-provinces.json";
import {
  VS_REGIONS_MAP_ID,
  ensureVsRegionsMapRegistered,
  resolveMapRegionName,
  resolveMapRegionNameAtLevel,
  type GeoMapRegionResolve,
} from "@/components/charts/engine/geo/geoMapChart";

type GeoFeatureProps = {
  name?: string;
  adcode?: number;
  level?: string;
};
type GeoJsonFeature = { properties?: GeoFeatureProps };
type RegionsGeo = { features?: GeoJsonFeature[] };

const MUNICIPALITY_ADCODES = new Set([110000, 120000, 310000, 500000]);

const cityGeoModules = import.meta.glob<RegionsGeo>("../../../../assets/geo/cities/*.json");
const districtGeoModules = import.meta.glob<RegionsGeo>("../../../../assets/geo/districts/*.json");

function buildGeoModuleIndex(modules: Record<string, () => Promise<unknown>>): Map<number, string> {
  const index = new Map<number, string>();
  for (const path of Object.keys(modules)) {
    const adcode = parseAdcodeFromModulePath(path);
    if (adcode !== null) index.set(adcode, path);
  }
  return index;
}

const cityModuleByAdcode = buildGeoModuleIndex(cityGeoModules);
const districtModuleByAdcode = buildGeoModuleIndex(districtGeoModules);

const registeredMapIds = new Set<string>([VS_REGIONS_MAP_ID]);

function geoMapId(adcode: number): string {
  return `vs-geo-${adcode}`;
}

function parseAdcodeFromModulePath(path: string): number | null {
  const match = path.match(/(\d{6})\.json$/);
  if (!match) return null;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : null;
}

export function isMunicipalityAdcode(adcode: number): boolean {
  return MUNICIPALITY_ADCODES.has(adcode);
}

export function lookupProvinceAdcode(provinceName: string): number | null {
  const resolved = resolveMapRegionName(provinceName);
  if (!resolved.matched) return null;
  const geo = getProvinceGeoIndex();
  return geo.nameToAdcode.get(resolved.name) ?? null;
}

export function lookupCityAdcode(
  cityName: string,
  provinceAdcode: number,
): number | null {
  const index = cityIndexCache.get(provinceAdcode);
  if (!index) return null;
  const resolved = resolveNameInGeoIndex(cityName, index);
  if (resolved.matched) {
    return index.nameToAdcode.get(resolved.name) ?? null;
  }
  const fallback = resolveMapRegionNameAtLevel(cityName, index.fullNames);
  return fallback.matched ? index.nameToAdcode.get(fallback.name) ?? null : null;
}

type GeoNameIndex = {
  fullNames: string[];
  nameToAdcode: Map<string, number>;
  shortToFull: Map<string, string>;
};

let provinceGeoIndex: GeoNameIndex | null = null;
const cityIndexCache = new Map<number, GeoNameIndex>();

function getProvinceGeoIndex(): GeoNameIndex {
  if (provinceGeoIndex) return provinceGeoIndex;
  ensureVsRegionsMapRegistered();
  const china = chinaProvincesGeo as RegionsGeo;
  provinceGeoIndex = buildGeoNameIndex(
    (china.features ?? []).filter((f) => f.properties?.level === "province"),
  );
  return provinceGeoIndex;
}

function buildGeoNameIndex(features: GeoJsonFeature[]): GeoNameIndex {
  const suffixRe = /(?:特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|区|县)$/u;
  const fullNames: string[] = [];
  const nameToAdcode = new Map<string, number>();
  const shortToFull = new Map<string, string>();

  for (const feature of features) {
    const fullName = feature.properties?.name?.trim();
    if (!fullName) continue;
    fullNames.push(fullName);
    if (typeof feature.properties?.adcode === "number") {
      nameToAdcode.set(fullName, feature.properties.adcode);
    }
    const shortName = fullName.replace(suffixRe, "");
    if (shortName && shortName !== fullName) {
      shortToFull.set(shortName, fullName);
    }
    shortToFull.set(fullName, fullName);
  }

  return { fullNames, nameToAdcode, shortToFull };
}

function resolveNameInGeoIndex(raw: unknown, index: GeoNameIndex): GeoMapRegionResolve {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { name: "", matched: false };
  if (index.fullNames.includes(trimmed)) return { name: trimmed, matched: true };
  if (index.shortToFull.has(trimmed)) {
    const full = index.shortToFull.get(trimmed)!;
    return { name: full, matched: index.fullNames.includes(full) };
  }
  const stripped = trimmed.replace(
    /(?:特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|区|县)$/u,
    "",
  );
  if (index.shortToFull.has(stripped)) {
    const full = index.shortToFull.get(stripped)!;
    return { name: full, matched: index.fullNames.includes(full) };
  }
  const byPrefix = index.fullNames.find(
    (name) => trimmed.startsWith(name) || stripped.startsWith(name.replace(/(?:市|区|县)$/u, "")),
  );
  if (byPrefix) return { name: byPrefix, matched: true };
  return { name: stripped || trimmed, matched: false };
}

async function loadBundledGeo(path: string | undefined): Promise<RegionsGeo | null> {
  if (!path) return null;
  const loader = cityGeoModules[path] ?? districtGeoModules[path];
  if (!loader) return null;
  const mod = await loader();
  return (mod as { default?: RegionsGeo }).default ?? mod;
}

function cityModulePath(adcode: number): string | undefined {
  return cityModuleByAdcode.get(adcode);
}

function districtModulePath(adcode: number): string | undefined {
  return districtModuleByAdcode.get(adcode);
}

function registerGeoMap(mapId: string, geo: RegionsGeo): void {
  registerOfflineGeoMap(mapId, geo);
  registeredMapIds.add(mapId);
}

export function isOfflineGeoMapReady(mapId: string): boolean {
  return Boolean(getOfflineGeoMap(mapId)?.features?.length);
}

/** 确保离线 GeoJSON 已注册（HMR 后 registeredMaps 失步时可恢复） */
export async function ensureOfflineGeoMap(mapId: string): Promise<boolean> {
  ensureVsRegionsMapRegistered();
  const trimmed = mapId.trim() || VS_REGIONS_MAP_ID;
  if (trimmed === VS_REGIONS_MAP_ID) {
    // 强制走 getOfflineGeoMap，触发全国资产幂等重注册
    return isOfflineGeoMapReady(VS_REGIONS_MAP_ID);
  }

  const match = /^vs-geo-(\d{6})$/.exec(trimmed);
  if (!match) {
    // 未知 id：至少保证全国可渲染，避免白屏「资产缺失」
    return isOfflineGeoMapReady(VS_REGIONS_MAP_ID);
  }
  if (isOfflineGeoMapReady(trimmed)) return true;

  const adcode = Number(match[1]);
  const cityIndex = await ensureCityMap(adcode);
  if (cityIndex && isOfflineGeoMapReady(trimmed)) return true;

  const districtIndex = await ensureDistrictMap(adcode);
  return Boolean(districtIndex && isOfflineGeoMapReady(trimmed));
}

async function ensureCityMap(provinceAdcode: number): Promise<GeoNameIndex | null> {
  const mapId = geoMapId(provinceAdcode);
  const cached = cityIndexCache.get(provinceAdcode);
  if (cached && isOfflineGeoMapReady(mapId)) return cached;

  const path = cityModulePath(provinceAdcode);
  if (!path) return null;
  const geo = await loadBundledGeo(path);
  if (!geo?.features?.length) return null;
  registerGeoMap(mapId, geo);
  const index = buildGeoNameIndex(geo.features);
  cityIndexCache.set(provinceAdcode, index);
  return index;
}

async function ensureDistrictMap(cityAdcode: number): Promise<GeoNameIndex | null> {
  const path = districtModulePath(cityAdcode);
  if (!path) return null;
  const geo = await loadBundledGeo(path);
  if (!geo?.features?.length) return null;
  const mapId = geoMapId(cityAdcode);
  registerGeoMap(mapId, geo);
  return buildGeoNameIndex(geo.features);
}

export type GeoMapLevelContext = {
  mapId: string;
  knownRegionNames: string[];
  drillDepth: number;
  levelLabel: string;
  missingAsset?: string;
};

export type ResolveGeoMapLevelInput = {
  config: ChartViewConfig;
  drillStack: ChartDrillFrame[];
};

export async function resolveGeoMapLevelContext(
  input: ResolveGeoMapLevelInput,
): Promise<GeoMapLevelContext> {
  ensureVsRegionsMapRegistered();
  const depth = input.drillStack.length;
  const provinceIndex = getProvinceGeoIndex();

  if (depth === 0) {
    return {
      mapId: VS_REGIONS_MAP_ID,
      knownRegionNames: provinceIndex.fullNames,
      drillDepth: 0,
      levelLabel: "省级",
    };
  }

  const provinceFrame = input.drillStack[0];
  const provinceAdcode = lookupProvinceAdcode(provinceFrame.value);
  if (!provinceAdcode) {
    return {
      mapId: VS_REGIONS_MAP_ID,
      knownRegionNames: provinceIndex.fullNames,
      drillDepth: 0,
      levelLabel: "省级",
      missingAsset: `未识别省级区域「${provinceFrame.label ?? provinceFrame.value}」`,
    };
  }

  const cityIndex = await ensureCityMap(provinceAdcode);
  if (!cityIndex) {
    return {
      mapId: VS_REGIONS_MAP_ID,
      knownRegionNames: provinceIndex.fullNames,
      drillDepth: 0,
      levelLabel: "省级",
      missingAsset:
        provinceAdcode === 710000
          ? "台湾省暂无市级离线边界资产"
          : `暂无「${provinceFrame.label ?? provinceFrame.value}」的市级离线边界`,
    };
  }

  if (depth === 1) {
    const isMunicipality = isMunicipalityAdcode(provinceAdcode);
    return {
      mapId: geoMapId(provinceAdcode),
      knownRegionNames: cityIndex.fullNames,
      drillDepth: 1,
      levelLabel: isMunicipality ? "区县级" : "市级",
    };
  }

  const cityFrame = input.drillStack[1];
  const cityAdcode = lookupCityAdcode(cityFrame.value, provinceAdcode);
  if (!cityAdcode) {
    return {
      mapId: geoMapId(provinceAdcode),
      knownRegionNames: cityIndex.fullNames,
      drillDepth: 1,
      levelLabel: "市级",
      missingAsset: `未识别城市「${cityFrame.label ?? cityFrame.value}」`,
    };
  }

  const districtIndex = await ensureDistrictMap(cityAdcode);
  if (!districtIndex) {
    return {
      mapId: geoMapId(provinceAdcode),
      knownRegionNames: cityIndex.fullNames,
      drillDepth: 1,
      levelLabel: "市级",
      missingAsset: `暂无「${cityFrame.label ?? cityFrame.value}」的区县离线边界（可继续使用市级视图）`,
    };
  }

  return {
    mapId: geoMapId(cityAdcode),
    knownRegionNames: districtIndex.fullNames,
    drillDepth: 2,
    levelLabel: "区县级",
  };
}

/** 将地图点击名称转为与数据列一致、可用于 filterRowsByDrillStack 的值 */
export function findMapDrillFilterValue(
  clickedName: string,
  field: string,
  rows: unknown[][],
  columns: string[],
  knownNames: string[],
): string {
  const colIdx = columns.indexOf(field);
  if (colIdx < 0) return clickedName;

  const target = resolveMapRegionNameAtLevel(clickedName, knownNames);
  for (const row of rows) {
    const raw = String(row[colIdx] ?? "");
    if (!raw) continue;
    const resolved = resolveMapRegionNameAtLevel(raw, knownNames);
    if (target.matched && resolved.matched && resolved.name === target.name) {
      return raw;
    }
    if (raw === clickedName) return raw;
  }
  return clickedName;
}

export function listOfflineProvinceNames(): string[] {
  return [...getProvinceGeoIndex().fullNames].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export async function listOfflineCityNames(provinceAdcode: number): Promise<string[]> {
  const index = await ensureCityMap(provinceAdcode);
  if (!index) return [];
  return [...index.fullNames].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export async function listOfflineDistrictNames(cityAdcode: number): Promise<string[]> {
  const index = await ensureDistrictMap(cityAdcode);
  if (!index) return [];
  return [...index.fullNames].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function listBundledCityProvinceAdcodes(): number[] {
  return Object.keys(cityGeoModules)
    .map(parseAdcodeFromModulePath)
    .filter((code): code is number => code !== null);
}

export function listBundledDistrictCityAdcodes(): number[] {
  return Object.keys(districtGeoModules)
    .map(parseAdcodeFromModulePath)
    .filter((code): code is number => code !== null);
}

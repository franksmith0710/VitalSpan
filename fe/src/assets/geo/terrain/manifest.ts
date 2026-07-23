/** 自动生成：pnpm run build:geo-terrain */

export const CHINA_TERRAIN_NATIONAL_ID = "national" as const;

export const CHINA_TERRAIN_BOUNDS = {
  west: 72.27048869999999,
  south: 2.82878928,
  east: 136.32753630000002,
  north: 54.558062719999995,
} as const;

export const CHINA_TERRAIN_PROVINCE_ADCODES = [
  440000,
  510000,
  110000,
  310000,
] as const;

export type ChinaTerrainProvinceAdcode = (typeof CHINA_TERRAIN_PROVINCE_ADCODES)[number];

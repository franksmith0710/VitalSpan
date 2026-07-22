/** 自动生成：pnpm run build:geo-terrain */

export const CHINA_TERRAIN_NATIONAL_ID = "national" as const;

export const CHINA_TERRAIN_BOUNDS = {
  west: 73,
  south: 17,
  east: 136,
  north: 54,
} as const;

export const CHINA_TERRAIN_PROVINCE_ADCODES = [
  440000,
  510000,
  110000,
  310000,
] as const;

export type ChinaTerrainProvinceAdcode = (typeof CHINA_TERRAIN_PROVINCE_ADCODES)[number];

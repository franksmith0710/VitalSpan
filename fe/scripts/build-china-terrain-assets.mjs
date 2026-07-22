/**
 * 生成离线中国地形三件套：diffuse / normal / displacement + meta.json
 * 用法：pnpm run build:geo-terrain
 * 可选：传入 Natural Earth GeoTIFF 路径作为第二参数以替换合成高程
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  CHINA_BOUNDS,
  PILOT_PROVINCE_ADCODES,
  buildHeightGrid,
  buildTerrainRgba,
  buildNormalRgba,
  buildDisplacementRgba,
} from "./lib/chinaTerrainSynth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/assets/geo/terrain");
const PROVINCES_GEO = path.join(ROOT, "src/assets/geo/china-provinces.json");

const NATIONAL_SIZE = 1024;
const PROVINCE_SIZE = 768;

async function readProvinceBounds(adcode) {
  const raw = await fs.readFile(PROVINCES_GEO, "utf8");
  const geo = JSON.parse(raw);
  const feature = geo.features?.find((f) => f.properties?.adcode === adcode);
  if (!feature?.geometry) return null;

  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  const visit = (coord) => {
    const [lng, lat] = coord;
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  };

  const walk = (geometry) => {
    if (geometry.type === "Polygon") {
      for (const ring of geometry.coordinates) for (const c of ring) visit(c);
    } else if (geometry.type === "MultiPolygon") {
      for (const poly of geometry.coordinates) {
        for (const ring of poly) for (const c of ring) visit(c);
      }
    }
  };
  walk(feature.geometry);

  const padLng = (east - west) * 0.06 || 0.5;
  const padLat = (north - south) * 0.06 || 0.5;
  return {
    west: west - padLng,
    east: east + padLng,
    south: south - padLat,
    north: north + padLat,
  };
}

async function writePack(dir, bounds, size) {
  await fs.mkdir(dir, { recursive: true });
  const height = buildHeightGrid(size, bounds);
  const diffuse = buildTerrainRgba(height, size);
  const normal = buildNormalRgba(height, size);
  const displacement = buildDisplacementRgba(height, size);

  await sharp(diffuse, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 82 })
    .toFile(path.join(dir, "diffuse.webp"));
  await sharp(normal, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 85 })
    .toFile(path.join(dir, "normal.webp"));
  await sharp(displacement, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 80 })
    .toFile(path.join(dir, "displacement.webp"));

  const meta = {
    bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
    size,
  };
  await fs.writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

async function writeManifest(provinceAdcodes) {
  const manifest = `/** 自动生成：pnpm run build:geo-terrain */\n\nexport const CHINA_TERRAIN_NATIONAL_ID = "national" as const;\n\nexport const CHINA_TERRAIN_BOUNDS = {\n  west: ${CHINA_BOUNDS.west},\n  south: ${CHINA_BOUNDS.south},\n  east: ${CHINA_BOUNDS.east},\n  north: ${CHINA_BOUNDS.north},\n} as const;\n\nexport const CHINA_TERRAIN_PROVINCE_ADCODES = [\n${provinceAdcodes.map((c) => `  ${c},`).join("\n")}\n] as const;\n\nexport type ChinaTerrainProvinceAdcode = (typeof CHINA_TERRAIN_PROVINCE_ADCODES)[number];\n`;
  await fs.writeFile(path.join(OUT, "manifest.ts"), manifest, "utf8");
}

async function main() {
  console.log("Building national terrain pack…");
  await writePack(path.join(OUT, "national"), CHINA_BOUNDS, NATIONAL_SIZE);

  const builtProvinces = [];
  for (const adcode of PILOT_PROVINCE_ADCODES) {
    const bounds = await readProvinceBounds(adcode);
    if (!bounds) {
      console.warn(`Skip province ${adcode}: no geometry`);
      continue;
    }
    console.log(`Building province ${adcode}…`);
    await writePack(path.join(OUT, "provinces", String(adcode)), bounds, PROVINCE_SIZE);
    builtProvinces.push(adcode);
  }

  await writeManifest(builtProvinces);
  console.log(`Done. National + ${builtProvinces.length} province packs → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 将 _source/*.png（sat-hunter 或 fetch:terrain-sat）转为运行时 webp + meta.json
 * 用法：pnpm run build:geo-terrain
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  PILOT_PROVINCE_ADCODES,
  buildHeightGridMercator,
  buildDisplacementRgbaRect,
} from "./lib/chinaTerrainSynth.mjs";
import { readNationalBounds, readProvinceBounds } from "./lib/terrainPackBounds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/assets/geo/terrain");

const NATIONAL_MAX_EDGE = 1024;
const PROVINCE_MAX_EDGE = 768;

const SATHUNTER_HINT = `
缺少卫星源图。请任选其一：
  1. sat-hunter 手动导出 diffuse.png / normal.png → 放入 {pack}/_source/
     https://github.com/knight-L/sat-hunter
  2. pnpm run fetch:terrain-sat（构建期 ESRI 瓦片 + 轮廓 mask，对标 sat-hunter）
`;

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function requireSource(packDir, name) {
  const p = path.join(packDir, "_source", name);
  if (!(await fileExists(p))) {
    throw new Error(`Missing ${p}${SATHUNTER_HINT}`);
  }
  return p;
}

async function resizePreserveAspect(srcPath, maxEdge) {
  const meta = await sharp(srcPath).metadata();
  const w = meta.width ?? maxEdge;
  const h = meta.height ?? maxEdge;
  const scale = maxEdge / Math.max(w, h);
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const buf = await sharp(srcPath).resize(outW, outH, { fit: "fill" }).webp({ quality: 85 }).toBuffer();
  return { buf, width: outW, height: outH };
}

async function writePack(dir, bounds, maxEdge) {
  await fs.mkdir(dir, { recursive: true });
  const diffuseSrc = await requireSource(dir, "diffuse.png");
  const normalSrc = path.join(dir, "_source", "normal.png");
  const hasNormal = await fileExists(normalSrc);

  const diffuse = await resizePreserveAspect(diffuseSrc, maxEdge);
  await fs.writeFile(path.join(dir, "diffuse.webp"), diffuse.buf);

  let normal = null;
  if (hasNormal) {
    normal = await resizePreserveAspect(normalSrc, maxEdge);
    await fs.writeFile(path.join(dir, "normal.webp"), normal.buf);
  } else {
    console.warn(`  no normal.png in ${dir}/_source — skipping normal.webp`);
  }

  const height = buildHeightGridMercator(diffuse.width, diffuse.height, bounds);
  const displacement = buildDisplacementRgbaRect(height, diffuse.width, diffuse.height);
  await sharp(displacement, {
    raw: { width: diffuse.width, height: diffuse.height, channels: 4 },
  })
    .webp({ quality: 80 })
    .toFile(path.join(dir, "displacement.webp"));

  const bakeMetaPath = path.join(dir, "_source", "bake-meta.json");
  let refViewport = [800, 600];
  if (await fileExists(bakeMetaPath)) {
    try {
      const bakeMeta = JSON.parse(await fs.readFile(bakeMetaPath, "utf8"));
      if (Array.isArray(bakeMeta.refViewport)) refViewport = bakeMeta.refViewport;
    } catch {
      /* keep default */
    }
  }

  const meta = {
    bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
    width: diffuse.width,
    height: diffuse.height,
    source: "satellite",
    uvMode: "projBounds",
    refViewport,
    masked: true,
  };
  await fs.writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return { bounds, meta };
}

async function writeManifest(nationalBounds) {
  const manifest = `/** 自动生成：pnpm run build:geo-terrain */\n\nexport const CHINA_TERRAIN_NATIONAL_ID = "national" as const;\n\nexport const CHINA_TERRAIN_BOUNDS = {\n  west: ${nationalBounds.west},\n  south: ${nationalBounds.south},\n  east: ${nationalBounds.east},\n  north: ${nationalBounds.north},\n} as const;\n\nexport const CHINA_TERRAIN_PROVINCE_ADCODES = [\n${PILOT_PROVINCE_ADCODES.map((c) => `  ${c},`).join("\n")}\n] as const;\n\nexport type ChinaTerrainProvinceAdcode = (typeof CHINA_TERRAIN_PROVINCE_ADCODES)[number];\n`;
  await fs.writeFile(path.join(OUT, "manifest.ts"), manifest, "utf8");
}

async function main() {
  const nationalBounds = await readNationalBounds();
  console.log("Building national terrain pack…");
  await writePack(path.join(OUT, "national"), nationalBounds, NATIONAL_MAX_EDGE);

  const builtProvinces = [];
  for (const adcode of PILOT_PROVINCE_ADCODES) {
    const bounds = await readProvinceBounds(adcode);
    if (!bounds) {
      console.warn(`Skip province ${adcode}: no geometry`);
      continue;
    }
    console.log(`Building province ${adcode}…`);
    await writePack(path.join(OUT, "provinces", String(adcode)), bounds, PROVINCE_MAX_EDGE);
    builtProvinces.push(adcode);
  }

  await writeManifest(nationalBounds);
  console.log(`Done. National + ${builtProvinces.length} province packs → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

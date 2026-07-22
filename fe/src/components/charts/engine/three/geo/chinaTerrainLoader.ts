import * as THREE from "three";
import nationalMeta from "@/assets/geo/terrain/national/meta.json";
import nationalDiffuseUrl from "@/assets/geo/terrain/national/diffuse.webp?url";
import nationalNormalUrl from "@/assets/geo/terrain/national/normal.webp?url";
import nationalDisplacementUrl from "@/assets/geo/terrain/national/displacement.webp?url";
import {
  CHINA_TERRAIN_NATIONAL_ID,
  CHINA_TERRAIN_PROVINCE_ADCODES,
  type ChinaTerrainProvinceAdcode,
} from "@/assets/geo/terrain/manifest";

export type TerrainGeoBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ChinaTerrainPack = {
  level: "national" | "province";
  adcode: number | null;
  bounds: TerrainGeoBounds;
  colorMap: THREE.Texture;
  normalMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
  dispose: () => void;
};

export type LoadTerrainPackOpts = {
  mapId?: string;
  drillDepth?: number;
  isDark?: boolean;
};

const VS_REGIONS_MAP_ID = "vs-regions";

const provinceMetaGlob = import.meta.glob<{ default: { bounds: number[]; size: number } }>(
  "@/assets/geo/terrain/provinces/*/meta.json",
  { eager: true },
);

const provinceDiffuseGlob = import.meta.glob<string>("@/assets/geo/terrain/provinces/*/diffuse.webp", {
  query: "?url",
  import: "default",
  eager: true,
});
const provinceNormalGlob = import.meta.glob<string>("@/assets/geo/terrain/provinces/*/normal.webp", {
  query: "?url",
  import: "default",
  eager: true,
});
const provinceDisplacementGlob = import.meta.glob<string>(
  "@/assets/geo/terrain/provinces/*/displacement.webp",
  { query: "?url", import: "default", eager: true },
);

const provinceMetaByAdcode = new Map<number, { bounds: number[]; size: number }>();
for (const [key, mod] of Object.entries(provinceMetaGlob)) {
  const m = /provinces\/(\d+)\/meta\.json$/.exec(key);
  if (!m) continue;
  const data = "default" in mod ? mod.default : (mod as { bounds: number[]; size: number });
  provinceMetaByAdcode.set(Number(m[1]), data);
}

function provinceAssetUrl(glob: Record<string, string>, adcode: number, kind: string): string | null {
  const key = Object.keys(glob).find((k) => k.includes(`/provinces/${adcode}/${kind}.webp`));
  return key ? glob[key] : null;
}

function isPilotProvince(adcode: number): adcode is ChinaTerrainProvinceAdcode {
  return (CHINA_TERRAIN_PROVINCE_ADCODES as readonly number[]).includes(adcode);
}

export function parseAdcodeFromMapId(mapId: string): number | null {
  const m = /^vs-geo-(\d{6})$/.exec(mapId.trim());
  if (!m) return null;
  return Number(m[1]);
}

export function resolveTerrainPackKey(mapId: string | undefined, drillDepth = 0): {
  level: "national" | "province";
  adcode: number | null;
} {
  const id = mapId?.trim() || VS_REGIONS_MAP_ID;
  if (drillDepth <= 0 || id === VS_REGIONS_MAP_ID) {
    return { level: "national", adcode: null };
  }
  const adcode = parseAdcodeFromMapId(id);
  if (adcode != null && isPilotProvince(adcode) && provinceMetaByAdcode.has(adcode)) {
    return { level: "province", adcode };
  }
  return { level: "national", adcode: null };
}

function boundsFromMeta(meta: { bounds: number[] }): TerrainGeoBounds {
  const [west, south, east, north] = meta.bounds;
  return { west, south, east, north };
}

function loadTexture(url: string, colorSpace?: THREE.ColorSpace): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.flipY = false;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        if (colorSpace) tex.colorSpace = colorSpace;
        resolve(tex);
      },
      undefined,
      () => reject(new Error(`terrain texture failed: ${url}`)),
    );
  });
}

function createPack(
  level: "national" | "province",
  adcode: number | null,
  bounds: TerrainGeoBounds,
  diffuseUrl: string,
  normalUrl?: string | null,
  displacementUrl?: string | null,
): Promise<ChinaTerrainPack> {
  return loadTexture(diffuseUrl, THREE.SRGBColorSpace).then(async (colorMap) => {
    let normalMap: THREE.Texture | undefined;
    let displacementMap: THREE.Texture | undefined;

    if (normalUrl) {
      try {
        normalMap = await loadTexture(normalUrl);
      } catch {
        normalMap = undefined;
      }
    }
    if (displacementUrl) {
      try {
        displacementMap = await loadTexture(displacementUrl);
      } catch {
        displacementMap = undefined;
      }
    }

    return {
      level,
      adcode,
      bounds,
      colorMap,
      normalMap,
      displacementMap,
      dispose: () => {
        colorMap.dispose();
        normalMap?.dispose();
        displacementMap?.dispose();
      },
    };
  });
}

const cache = new Map<string, Promise<ChinaTerrainPack>>();

export function loadChinaTerrainPack(opts: LoadTerrainPackOpts): Promise<ChinaTerrainPack> {
  const { mapId, drillDepth = 0 } = opts;
  const keySpec = resolveTerrainPackKey(mapId, drillDepth);
  const cacheKey = `${keySpec.level}:${keySpec.adcode ?? CHINA_TERRAIN_NATIONAL_ID}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let promise: Promise<ChinaTerrainPack>;
  if (keySpec.level === "province" && keySpec.adcode != null) {
    const adcode = keySpec.adcode;
    const meta = provinceMetaByAdcode.get(adcode);
    const diffuse = provinceAssetUrl(provinceDiffuseGlob, adcode, "diffuse");
    const normal = provinceAssetUrl(provinceNormalGlob, adcode, "normal");
    const displacement = provinceAssetUrl(provinceDisplacementGlob, adcode, "displacement");
    if (!meta || !diffuse || !normal || !displacement) {
      promise = loadChinaTerrainPack({ mapId: VS_REGIONS_MAP_ID, drillDepth: 0 });
    } else {
      promise = createPack("province", adcode, boundsFromMeta(meta), diffuse, normal, displacement);
    }
  } else {
    promise = createPack(
      "national",
      null,
      boundsFromMeta(nationalMeta),
      nationalDiffuseUrl,
      nationalNormalUrl,
      nationalDisplacementUrl,
    );
  }

  cache.set(cacheKey, promise);
  promise.catch(() => {
    cache.delete(cacheKey);
  });
  return promise;
}

export function clearChinaTerrainPackCache(): void {
  cache.clear();
}

export function nationalTerrainBounds(): TerrainGeoBounds {
  return boundsFromMeta(nationalMeta);
}

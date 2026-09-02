/** Protomaps 官方静态资源（glyphs / sprites）。github.io 在部分网络不可达，运行时改走 jsDelivr 镜像。 */
export const PROTOMAPS_ASSETS_GITHUB = "https://protomaps.github.io/basemaps-assets";

/** 与 Protomaps basemaps v4 资源布局对齐；@main 跟踪 basemaps-assets 仓库默认分支。 */
export const PROTOMAPS_ASSETS_MIRROR = "https://fastly.jsdelivr.net/gh/protomaps/basemaps-assets@main";

export const DEFAULT_PROTOMAPS_GLYPHS_URL = `${PROTOMAPS_ASSETS_MIRROR}/fonts/{fontstack}/{range}.pbf`;

export const DEFAULT_PROTOMAPS_SPRITE_BASE = `${PROTOMAPS_ASSETS_MIRROR}/sprites/v4`;

export function mirrorProtomapsBasemapAssetsUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.includes("protomaps.github.io/basemaps-assets")) {
    return trimmed;
  }
  return trimmed.replace(PROTOMAPS_ASSETS_GITHUB, PROTOMAPS_ASSETS_MIRROR);
}

/** 开发态可走 Vite 同源代理，避免 MapLibre worker 对外部 CDN 偶发失败。 */
export function resolveDevBasemapAssetsUrl(url: string): string {
  const mirrored = mirrorProtomapsBasemapAssetsUrl(url);
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return mirrored;
  }
  try {
    const parsed = new URL(mirrored);
    if (parsed.pathname.startsWith("/dev-basemaps-assets/")) {
      return mirrored;
    }
    if (
      parsed.hostname === "fastly.jsdelivr.net" &&
      parsed.pathname.includes("/protomaps/basemaps-assets@")
    ) {
      const assetPath = parsed.pathname.replace(/^\/gh\/protomaps\/basemaps-assets@[^/]+/, "");
      return `${window.location.origin}/dev-basemaps-assets${assetPath}`;
    }
    if (mirrored.includes("protomaps.github.io/basemaps-assets")) {
      const assetPath = parsed.pathname.replace(/^\/basemaps-assets/, "");
      return `${window.location.origin}/dev-basemaps-assets${assetPath}`;
    }
  } catch {
    return mirrored;
  }
  return mirrored;
}

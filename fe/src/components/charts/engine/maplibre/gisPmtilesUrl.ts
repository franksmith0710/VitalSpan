import type { TileServiceResolve } from "@/lib/tileServices";

/** 本地 PMTiles 外部服务端口（docker pmtiles-tile-server 默认 8080）。 */
const DEV_PMTILES_PORT = "8080";

/**
 * 开发态把跨域 PMTiles 归档改走 Vite 同源代理，避免 worker/Range 在 localhost↔127.0.0.1 组合下偶发失败。
 * 生产构建不改写，仍用平台登记的绝对 URL。
 */
export function resolveGisPmtilesArchiveUrl(rawUrl: string): string {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return rawUrl;
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.port !== DEV_PMTILES_PORT && !parsed.pathname.endsWith(".pmtiles")) {
      return rawUrl;
    }
    return `${window.location.origin}/dev-pmtiles${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

export function withDevPmtilesArchiveUrl(resolved: TileServiceResolve): TileServiceResolve {
  return {
    ...resolved,
    pmtilesUrl: resolveGisPmtilesArchiveUrl(resolved.pmtilesUrl),
  };
}

export function buildPmtilesVectorSourceUrl(httpUrl: string): string {
  return `pmtiles://${httpUrl}`;
}

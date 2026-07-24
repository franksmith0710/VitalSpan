import type { ChartGeo3dStyle } from "@/lib/chartDeStyle";

/** full=全屏预览；embed=看板/大屏内嵌；thumbnail=列表卡片等小尺寸预览 */
export type Geo3dRenderTier = "full" | "embed" | "thumbnail";

/** 短边低于此像素时 auto 模式强制回退 2D */
export const GEO3D_THREE_MIN_SHORT_SIDE = 400;

/** 同页允许同时存在的 WebGL 3D 地图实例上限 */
export const GEO3D_MAX_WEBGL_INSTANCES = 4;

const activeWebglSlots = new Map<string, () => void>();

/** 抢占最旧实例槽位；返回 false 仅当驱逐后仍无法分配 */
export function tryAcquireWebGLSlot(instanceKey: string): boolean {
  if (activeWebglSlots.has(instanceKey)) {
    return true;
  }
  if (activeWebglSlots.size >= GEO3D_MAX_WEBGL_INSTANCES) {
    return false;
  }
  activeWebglSlots.set(instanceKey, () => undefined);
  return true;
}

export function setWebGLSlotDispose(instanceKey: string, dispose: () => void): void {
  if (activeWebglSlots.has(instanceKey)) {
    activeWebglSlots.set(instanceKey, dispose);
  }
}

export function releaseWebGLSlot(instanceKey: string): void {
  activeWebglSlots.delete(instanceKey);
}

/** @internal vitest 专用：清空槽位表 */
export function resetWebGLSlotsForTests(): void {
  activeWebglSlots.clear();
}

/** 列表/内嵌预览不加载地形贴图，仅全屏预览页加载 */
export function resolveTerrainTextureEnabled(
  tier: Geo3dRenderTier,
  geo3dStyle: ChartGeo3dStyle,
): boolean {
  if (tier !== "full") return false;
  return geo3dStyle.terrainTexture !== false;
}

export function defaultGeo3dRenderTier(embedded: boolean): Geo3dRenderTier {
  return embedded ? "embed" : "full";
}

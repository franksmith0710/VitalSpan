/** 看板内嵌 3D 地图：跨 React 重渲染保留用户 orbit 视角（避免重建后跳回默认机位） */
export type Geo3dOrbitSnapshot = {
  target: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
};

const orbitByInstance = new Map<string, Geo3dOrbitSnapshot>();

export function readGeo3dOrbitState(instanceKey: string | undefined): Geo3dOrbitSnapshot | null {
  if (!instanceKey) return null;
  return orbitByInstance.get(instanceKey) ?? null;
}

export function writeGeo3dOrbitState(
  instanceKey: string | undefined,
  snapshot: Geo3dOrbitSnapshot,
): void {
  if (!instanceKey) return;
  orbitByInstance.set(instanceKey, snapshot);
}

/** @internal vitest */
export function resetGeo3dOrbitStateForTests(): void {
  orbitByInstance.clear();
}

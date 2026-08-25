export type ForceGraphNodePosition = {
  x: number;
  y: number;
  fx: number;
  fy: number;
};

const layoutByInstance = new Map<string, Record<string, ForceGraphNodePosition>>();

export function readForceGraphLayoutState(
  instanceKey: string | undefined,
): Record<string, ForceGraphNodePosition> | null {
  if (!instanceKey) return null;
  const snapshot = layoutByInstance.get(instanceKey);
  return snapshot ? { ...snapshot } : null;
}

export function writeForceGraphLayoutState(
  instanceKey: string | undefined,
  nodes: ReadonlyArray<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>,
): void {
  if (!instanceKey) return;
  const next: Record<string, ForceGraphNodePosition> = {};
  for (const node of nodes) {
    if (node.x == null || node.y == null) continue;
    next[node.id] = {
      x: node.x,
      y: node.y,
      fx: node.fx ?? node.x,
      fy: node.fy ?? node.y,
    };
  }
  if (Object.keys(next).length === 0) {
    layoutByInstance.delete(instanceKey);
    return;
  }
  layoutByInstance.set(instanceKey, next);
}

export function resetForceGraphLayoutStateForTests(): void {
  layoutByInstance.clear();
}

const registeredTargets = new WeakSet<object>();

export async function registerPmtilesProtocol(maplibregl: typeof import("maplibre-gl")): Promise<void> {
  if (registeredTargets.has(maplibregl as object)) return;
  const { Protocol } = await import("pmtiles");
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registeredTargets.add(maplibregl as object);
}

export function resetPmtilesProtocolForTests(): void {
  // WeakSet cannot be cleared; tests import a fresh maplibre module per run.
}

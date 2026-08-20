let registered = false;

export async function registerPmtilesProtocol(maplibregl: typeof import("maplibre-gl")): Promise<void> {
  if (registered) return;
  const { Protocol } = await import("pmtiles");
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
}

export function resetPmtilesProtocolForTests(): void {
  registered = false;
}

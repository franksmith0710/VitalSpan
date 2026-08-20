import { apiFetch } from "@/lib/api";

export type TileServiceResolve = {
  id: string;
  name: string;
  pmtilesUrl: string;
  glyphsUrl: string;
  spriteUrl: string;
};

export type TileServiceListItem = {
  id: string;
  name: string;
  enabled: boolean;
};

type TileServiceListResponse = {
  items: TileServiceListItem[];
};

export async function listTileServices(): Promise<TileServiceListItem[]> {
  const res = await apiFetch<TileServiceListResponse>("/api/v1/tile-services");
  return res.items ?? [];
}

export async function resolveTileService(serviceId: string): Promise<TileServiceResolve> {
  return apiFetch<TileServiceResolve>(`/api/v1/tile-services/${encodeURIComponent(serviceId)}/resolve`);
}

import { apiFetch } from "@/lib/api";

export type AiVizArtifactMeta = {
  artifactId: string;
  manifest: {
    id?: string;
    displayName?: string;
    version?: string;
    entry?: string;
    fieldSlots?: Record<string, unknown>;
    styleSchema?: Record<string, unknown>;
    defaultStyle?: Record<string, unknown>;
    rendererHint?: string;
  };
  status: string;
  contentHash: string;
};

export type AiVizArtifactListResponse = {
  items: AiVizArtifactMeta[];
};

export function fetchAiVizArtifacts(limit = 100, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<AiVizArtifactListResponse>(`/api/v1/ai-viz/artifacts?${params.toString()}`);
}

export function fetchAiVizArtifactMeta(artifactId: string) {
  return apiFetch<AiVizArtifactMeta>(`/api/v1/ai-viz/artifacts/${encodeURIComponent(artifactId)}`);
}

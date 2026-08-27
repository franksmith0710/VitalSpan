import { apiFetch, ApiRequestError } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

export type AiVizComplianceWarning = {
  code: string;
  message: string;
};

export type AiVizStyleComplianceTier = "full" | "partial" | "visual-only";

export const AI_VIZ_STYLE_COMPLIANCE_LABELS: Record<AiVizStyleComplianceTier, string> = {
  full: "样式合规",
  partial: "部分合规",
  "visual-only": "仅视觉",
};

export type AiVizArtifactMeta = {
  artifactId: string;
  manifest: {
    id?: string;
    displayName?: string;
    version?: string;
    entry?: string;
    fieldSlots?: Record<string, unknown>;
    styleSchema?: Record<string, unknown>;
    styleHooks?: Record<string, unknown>;
    defaultStyle?: Record<string, unknown>;
    rendererHint?: string;
  };
  status: string;
  contentHash: string;
  warnings?: AiVizComplianceWarning[];
  styleComplianceTier?: AiVizStyleComplianceTier;
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

export function deleteAiVizArtifact(artifactId: string) {
  return apiFetch<void>(`/api/v1/ai-viz/artifacts/${encodeURIComponent(artifactId)}`, {
    method: "DELETE",
  });
}

type AiVizArtifactReferenceField = {
  dashboardId?: string;
  dashboardName?: string;
  widgetId?: string;
};

/** 删除失败时拼接引用看板名称（AIVIZ_IN_USE） */
export function formatAiVizArtifactDeleteError(err: unknown): string {
  const base = mapApiError(err);
  if (err instanceof ApiRequestError && err.code === "AIVIZ_IN_USE" && err.fields?.length) {
    const names = err.fields
      .map((field) => (field as AiVizArtifactReferenceField).dashboardName)
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) {
      const unique = [...new Set(names)];
      return `${base}：${unique.join("、")}`;
    }
  }
  return base;
}

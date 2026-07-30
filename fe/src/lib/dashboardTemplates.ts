import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { apiFetch } from "@/lib/api";

export type VizSurfaceKind = "dashboard" | "data-screen";

export type DashboardTemplateListItem = {
  id: string;
  templateKey: string;
  name: string;
  description: string | null;
  categoryKey: string;
  surfaceKind: VizSurfaceKind;
  status: "draft" | "published" | "archived";
  thumbnailRef: string | null;
  visibility: "builtin" | "org" | "private";
  contentRevision: number;
  updatedAt: string;
  publishedAt: string | null;
};

export type DashboardTemplateDetail = DashboardTemplateListItem & {
  layoutJson: Record<string, unknown>;
  sourceDashboardId: string | null;
  ownerUserId: string | null;
  orgScope: string | null;
  createdAt: string;
};

export type DashboardTemplateListResponse = {
  items: DashboardTemplateListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type VizLayoutEnvelope = {
  templateVersion: 1;
  kind: "viz-layout" | "data-screen";
  surfaceKind?: VizSurfaceKind;
  name: string;
  description?: string | null;
  categoryKey?: string;
  layout: Record<string, unknown>;
};

export const TEMPLATE_CATEGORIES: { key: string; label: string }[] = [
  { key: "general", label: "通用" },
  { key: "monitoring", label: "监控" },
  { key: "government", label: "政务" },
  { key: "analytics", label: "分析" },
];

/** Hub / 模板选择器不展示的内置空白起步模板（列表页仍可「新建空白」） */
export const HUB_HIDDEN_BUILTIN_TEMPLATE_KEYS = new Set([
  "builtin-screen-blank",
  "builtin-dash-blank",
]);

export function filterTemplatesForHub(
  items: DashboardTemplateListItem[],
): DashboardTemplateListItem[] {
  return items.filter((item) => !HUB_HIDDEN_BUILTIN_TEMPLATE_KEYS.has(item.templateKey));
}

export function buildTemplatesListUrl(params: {
  surfaceKind?: VizSurfaceKind;
  categoryKey?: string;
  q?: string;
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
}): string {
  const search = new URLSearchParams();
  if (params.surfaceKind) search.set("surfaceKind", params.surfaceKind);
  if (params.categoryKey) search.set("categoryKey", params.categoryKey);
  if (params.q) search.set("q", params.q);
  if (params.includeDrafts) search.set("includeDrafts", "true");
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  return `/api/v1/dashboard-templates${qs ? `?${qs}` : ""}`;
}

export function fetchDashboardTemplates(params: {
  surfaceKind?: VizSurfaceKind;
  categoryKey?: string;
  q?: string;
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
}) {
  return apiFetch<DashboardTemplateListResponse>(buildTemplatesListUrl(params));
}

export function fetchTemplateDetail(templateId: string) {
  return apiFetch<DashboardTemplateDetail>(`/api/v1/dashboard-templates/${templateId}`);
}

export function buildVizLayoutEnvelope(
  layout: DashboardLayout,
  name: string,
  surfaceKind: VizSurfaceKind,
): VizLayoutEnvelope {
  const trimmed = name.trim() || (surfaceKind === "data-screen" ? "未命名大屏" : "未命名看板");
  return {
    templateVersion: 1,
    kind: "viz-layout",
    surfaceKind,
    name: trimmed,
    layout: layout as unknown as Record<string, unknown>,
  };
}

export function createFromTemplate(templateId: string, name?: string) {
  return apiFetch<{ id: string }>("/api/v1/dashboards/from-template", {
    method: "POST",
    body: JSON.stringify({ templateId, name }),
  });
}

export function publishTemplate(templateId: string) {
  return apiFetch<DashboardTemplateDetail>(`/api/v1/dashboard-templates/${templateId}/publish`, {
    method: "POST",
  });
}

export function archiveTemplate(templateId: string) {
  return apiFetch<DashboardTemplateDetail>(`/api/v1/dashboard-templates/${templateId}/archive`, {
    method: "POST",
  });
}

export function importTemplateEnvelope(envelope: VizLayoutEnvelope) {
  return apiFetch<DashboardTemplateDetail>("/api/v1/dashboard-templates/import", {
    method: "POST",
    body: JSON.stringify(envelope),
  });
}

export function exportTemplateEnvelope(templateId: string) {
  return apiFetch<VizLayoutEnvelope>(`/api/v1/dashboard-templates/${templateId}/export`);
}

export function createTemplateFromDashboard(input: {
  name: string;
  description?: string;
  categoryKey?: string;
  surfaceKind: VizSurfaceKind;
  sourceDashboardId: string;
  visibility?: "private" | "org";
}) {
  return apiFetch<DashboardTemplateDetail>("/api/v1/dashboard-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { invalidateCatalogQueries } from "@/lib/catalogQueryInvalidation";
import { fetchAllCatalogNodes, normalizeCatalogNodes } from "@/lib/reportCatalogUtils";
import { provisionCatalogTemplate, type TemplateKind } from "@/lib/reportCatalogProvision";
import { queryKeys } from "@/lib/queryKeys";

export type CatalogNode = {
  id: string;
  name: string;
  parentId: string | null;
  nodeType: "folder" | "template";
  templateKind: "word" | "excel" | "pdf" | null;
  templateKey: string | null;
  sortOrder: number;
};

export type TemplateBlock = {
  blockType: "sql" | "table" | "chart";
  queryRef?: string;
  tableRef?: string;
  chartType?: "line" | "bar" | "pie";
};

export type TemplateDefinition = {
  templateKey: string;
  format: "word" | "excel" | "pdf";
  displayName: string;
  blocks: TemplateBlock[];
  storageRef?: string;
  exportHook?: { integrationPath: string; format: string; placeholder: boolean };
};

export type ExtensionMetric = {
  key: string;
  label: string;
  visible?: boolean;
  queryMode?: "sql" | "dataset";
  expression?: string | null;
  datasetId?: string | null;
  boundConfigId?: string | null;
  compareMode?: string;
};

export function useReportTemplates(parentId: string | null = null, templateKey: string | null = null) {
  const qc = useQueryClient();
  const nodesQuery = useQuery({
    queryKey: queryKeys.reports.catalogNodes(parentId),
    queryFn: async () => {
      const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
      const raw = await apiFetch<{ items: CatalogNode[] } | CatalogNode[]>(
        `/api/v1/reports/catalog/nodes${q}`,
      );
      return { items: normalizeCatalogNodes(raw) };
    },
  });

  const createNode = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<CatalogNode>("/api/v1/reports/catalog/nodes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateCatalogQueries(qc),
  });

  const createTemplateNode = useMutation({
    mutationFn: (input: { name: string; parentId: string | null; templateKind: TemplateKind }) =>
      provisionCatalogTemplate(input),
    onSuccess: () => invalidateCatalogQueries(qc),
  });

  const updateNode = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string } }) =>
      apiFetch<CatalogNode>(`/api/v1/reports/catalog/nodes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateCatalogQueries(qc),
  });

  const deleteNode = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/v1/reports/catalog/nodes/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateCatalogQueries(qc),
  });

  const moveNode = useMutation({
    mutationFn: ({ id, parentId: pid }: { id: string; parentId: string | null }) =>
      apiFetch<CatalogNode>(`/api/v1/reports/catalog/nodes/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: pid }),
      }),
    onSuccess: () => invalidateCatalogQueries(qc),
  });

  const saveExtension = useMutation({
    mutationFn: ({ nodeId, body }: { nodeId: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/v1/reports/catalog/nodes/${nodeId}/extension`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: queryKeys.reports.extension(v.nodeId) }),
  });

  const templateQuery = useQuery({
    queryKey: queryKeys.reports.template(templateKey ?? ""),
    queryFn: () => apiFetch<TemplateDefinition>(`/api/v1/reports/templates/${templateKey}`),
    enabled: Boolean(templateKey),
    retry: false,
  });

  const saveTemplate = useMutation({
    mutationFn: ({ templateKey: key, body }: { templateKey: string; body: Record<string, unknown> }) =>
      apiFetch<TemplateDefinition>(`/api/v1/reports/templates/${key}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: queryKeys.reports.template(v.templateKey) }),
  });

  return {
    nodesQuery,
    createNode,
    createTemplateNode,
    updateNode,
    deleteNode,
    moveNode,
    saveExtension,
    templateQuery,
    saveTemplate,
  };
}

export function useCatalogNode(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.reports.catalogNode(nodeId ?? ""),
    queryFn: () => apiFetch<CatalogNode>(`/api/v1/reports/catalog/nodes/${nodeId}`),
    enabled: Boolean(nodeId),
    retry: false,
  });
}

export function useCatalogExtension(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.reports.extension(nodeId ?? ""),
    queryFn: () =>
      apiFetch<{
        catalogNodeId: string;
        metrics: ExtensionMetric[];
        filters: Array<{ key: string; operator: string }>;
        changeNote?: string | null;
        defaultDataSourceId?: string | null;
      }>(`/api/v1/reports/catalog/nodes/${nodeId}/extension`),
    enabled: Boolean(nodeId),
    retry: false,
  });
}

export function useAllCatalogNodes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.catalogAllNodes,
    queryFn: fetchAllCatalogNodes,
    enabled,
  });
}

export function useExtensionRenderSpec(nodeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reports.renderSpec(nodeId ?? ""),
    queryFn: () =>
      apiFetch<Record<string, unknown>>(
        `/api/v1/reports/catalog/nodes/${nodeId}/extension/render-spec`,
      ),
    enabled: Boolean(nodeId) && enabled,
  });
}

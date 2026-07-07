import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
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

export function useReportTemplates(parentId: string | null = null) {
  const qc = useQueryClient();
  const nodesQuery = useQuery({
    queryKey: queryKeys.reports.catalogNodes(parentId),
    queryFn: () => {
      const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
      return apiFetch<{ items: CatalogNode[] }>(`/api/v1/reports/catalog/nodes${q}`);
    },
  });

  const createNode = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<CatalogNode>("/api/v1/reports/catalog/nodes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reports", "catalogNodes"] }),
  });

  const moveNode = useMutation({
    mutationFn: ({ id, parentId: pid }: { id: string; parentId: string | null }) =>
      apiFetch<CatalogNode>(`/api/v1/reports/catalog/nodes/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: pid }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reports", "catalogNodes"] }),
  });

  const saveExtension = useMutation({
    mutationFn: ({ nodeId, body }: { nodeId: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/v1/reports/catalog/nodes/${nodeId}/extension`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: queryKeys.reports.extension(v.nodeId) }),
  });

  return { nodesQuery, createNode, moveNode, saveExtension };
}

export function useCatalogExtension(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.reports.extension(nodeId ?? ""),
    queryFn: () =>
      apiFetch<{
        catalogNodeId: string;
        metrics: Array<{ key: string; label: string; visible?: boolean }>;
        filters: Array<{ key: string; operator: string }>;
        changeNote?: string | null;
      }>(`/api/v1/reports/catalog/nodes/${nodeId}/extension`),
    enabled: Boolean(nodeId),
    retry: false,
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

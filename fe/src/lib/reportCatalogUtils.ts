import { apiFetch } from "@/lib/api";

export type ReportCatalogNode = {
  id: string;
  name: string;
  parentId: string | null;
  nodeType: "folder" | "template";
  templateKind: "word" | "excel" | "pdf" | null;
  templateKey: string | null;
  sortOrder: number;
};

type CatalogNodesResponse = ReportCatalogNode[] | { items: ReportCatalogNode[] };

export function normalizeCatalogNodes(data: CatalogNodesResponse): ReportCatalogNode[] {
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

async function listCatalogChildren(parentId: string | null): Promise<ReportCatalogNode[]> {
  const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  const raw = await apiFetch<CatalogNodesResponse>(`/api/v1/reports/catalog/nodes${q}`);
  return normalizeCatalogNodes(raw);
}

/** 递归收集目录下全部 template 节点（报表中心列表用）。 */
export async function fetchAllCatalogTemplates(): Promise<ReportCatalogNode[]> {
  const templates: ReportCatalogNode[] = [];

  async function walk(parentId: string | null) {
    const nodes = await listCatalogChildren(parentId);
    for (const node of nodes) {
      if (node.nodeType === "template") {
        templates.push(node);
      } else {
        await walk(node.id);
      }
    }
  }

  await walk(null);
  return templates.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-CN"));
}

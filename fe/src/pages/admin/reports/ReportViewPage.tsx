import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { useAuth } from "@/context/auth-context";
import type { ReportCatalogNode } from "@/lib/reportCatalogUtils";
import { ReportExportCard } from "./components/ReportExportCard";

type RenderSection = {
  kind: string;
  columns?: string[];
  rows?: unknown[][];
  placeholder?: boolean;
};

type RenderRunOut = {
  status: string;
  renderSpec: {
    sections: RenderSection[];
  };
  exportHook?: { integrationPath: string; format: string; placeholder: boolean };
};

function ResultTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="overflow-x-only">
      <table className="w-full min-w-[320px] text-theme-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportViewPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const { user } = useAuth();
  const canManage = Boolean(
    user?.isRoot || user?.roles?.includes("admin") || user?.roles?.includes("analyst"),
  );

  const nodeQuery = useQuery({
    queryKey: ["reports", "catalog-node", nodeId],
    queryFn: () => apiFetch<ReportCatalogNode>(`/api/v1/reports/catalog/nodes/${nodeId}`),
    enabled: Boolean(nodeId),
  });

  const runMutation = useMutation({
    mutationFn: () =>
      apiFetch<RenderRunOut>(`/api/v1/reports/templates/${nodeId}/run`, {
        method: "POST",
        body: JSON.stringify({ format: "web", parameters: {} }),
      }),
  });

  const node = nodeQuery.data;
  const section = runMutation.data?.renderSpec.sections[0];

  return (
    <AdminPageShell
      title={node?.name ?? "报表查看"}
      description="运行报表模板并查看 Web 展现结果。"
      actions={
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/reports/center">
            <ArrowLeft className="size-4" aria-hidden />
            返回报表中心
          </Link>
        </Button>
      }
    >
      {nodeQuery.isError ? (
        <PageErrorBanner message={mapApiError(nodeQuery.error)} onRetry={() => void nodeQuery.refetch()} />
      ) : null}

      {nodeQuery.isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}

      {node && node.nodeType !== "template" ? (
        <PanelEmptyState
          title="非模板节点"
          description="请选择目录中的具体报表模板进行查看。"
          variant="framed"
        />
      ) : null}

      {node?.nodeType === "template" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate()}
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  运行中…
                </>
              ) : (
                "运行报表"
              )}
            </Button>
            {canManage ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={`/admin/reports/templates/${node.id}`}>编辑模板</Link>
              </Button>
            ) : null}
          </div>

          {runMutation.isError ? (
            <PageErrorBanner message={mapApiError(runMutation.error)} />
          ) : null}

          {section ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-theme-sm">运行结果</CardTitle>
              </CardHeader>
              <CardContent>
                {section.placeholder ? (
                  <p className="text-theme-sm text-gray-500">占位数据（请配置扩展指标与数据源后查看真实结果）</p>
                ) : section.columns && section.rows ? (
                  <ResultTable columns={section.columns} rows={section.rows} />
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-theme-xs dark:bg-white/[0.04]">
                    {JSON.stringify(section, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ) : null}

          <ReportExportCard defaultTemplateId={node.id} />
        </div>
      ) : null}
    </AdminPageShell>
  );
}

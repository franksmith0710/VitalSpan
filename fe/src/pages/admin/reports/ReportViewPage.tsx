import { useEffect, useRef } from "react";
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
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/auth-context";
import type { ReportCatalogNode } from "@/lib/reportCatalogUtils";
import { ReportExportCard } from "./components/ReportExportCard";
import { ReportResultTable } from "./components/ReportResultTable";

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

export function ReportViewPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const canManage = matchesCapability(caps, "report:manage");

  const nodeQuery = useQuery({
    queryKey: queryKeys.reports.catalogNode(nodeId ?? ""),
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
  const { mutate: runReport, isPending: isRunning } = runMutation;
  const autoRanRef = useRef(false);

  useEffect(() => {
    autoRanRef.current = false;
  }, [nodeId]);

  useEffect(() => {
    if (!node || node.nodeType !== "template" || autoRanRef.current || isRunning) return;
    autoRanRef.current = true;
    runReport();
  }, [node, isRunning, runReport]);

  return (
    <AdminPageShell
      title={node?.name ?? "报表查看"}
      description="运行报表模板并查看 Web 展现结果。"
      actions={
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/reports/center">
            <ArrowLeft className="size-4" aria-hidden />
            返回全部报表
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
            <PageErrorBanner
              message={mapApiError(runMutation.error)}
              onRetry={() => runMutation.mutate()}
            />
          ) : null}

          {section ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-theme-sm">运行结果</CardTitle>
              </CardHeader>
              <CardContent>
                {section.placeholder ? (
                  <p className="text-theme-sm text-gray-500">
                    {canManage
                      ? "占位数据（请配置扩展指标与数据源后查看真实结果）"
                      : "暂无业务数据，当前为示例展示。如需完整报表，请联系管理员完善模板配置。"}
                  </p>
                ) : section.columns && section.rows ? (
                  <ReportResultTable columns={section.columns} rows={section.rows} />
                ) : (
                  <p className="text-theme-sm text-gray-500">
                    报表已运行，但当前格式暂不支持在此预览。请尝试导出或联系管理员。
                  </p>
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

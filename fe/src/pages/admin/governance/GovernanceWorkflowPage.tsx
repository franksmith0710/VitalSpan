import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { type WorkflowTemplate } from "./components/workflow-labels";
import { WorkflowEmptyState } from "./components/WorkflowEmptyState";
import { WorkflowMetrics } from "./components/WorkflowMetrics";
import { WorkflowTemplateDetail } from "./components/WorkflowTemplateDetail";
import { WorkflowTemplateList } from "./components/WorkflowTemplateList";

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15"
    >
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

export function GovernanceWorkflowPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.gov.workflowTemplates,
    queryFn: () => apiFetch<{ items: WorkflowTemplate[] }>("/api/v1/gov/workflow/templates"),
  });

  const items = data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <AdminPageShell
      title="治理工单"
      description="查看标准查询发布等工作流模板，了解各节点状态与负责角色配置（GOV-003）。"
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <WorkflowEmptyState />
      ) : (
        <>
          <WorkflowMetrics templates={items} selected={selected} />
          <div className="grid min-h-[480px] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm lg:grid-cols-[300px_1fr] dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 lg:border-r lg:border-b-0 dark:border-gray-800">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <p className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  流程模板
                </p>
              </div>
              <WorkflowTemplateList
                templates={items}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <div className="min-h-[360px] min-w-0">
              {selected ? <WorkflowTemplateDetail template={selected} /> : null}
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}

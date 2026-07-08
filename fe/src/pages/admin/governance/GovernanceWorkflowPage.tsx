import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { type WorkflowTemplate } from "./components/workflow-labels";
import { WorkflowEmptyState } from "./components/WorkflowEmptyState";
import { WorkflowMetrics } from "./components/WorkflowMetrics";
import { WorkflowTemplateDetail } from "./components/WorkflowTemplateDetail";
import { WorkflowTemplateList } from "./components/WorkflowTemplateList";
import { CreateWorkflowTemplateDialog } from "./components/CreateWorkflowTemplateDialog";
import { WorkflowInstancesPanel } from "./WorkflowInstancesPanel";

const TAB_TRIGGER_CLASS = cn(
  "rounded-md px-4 py-2 text-theme-sm",
  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-theme-xs",
  "dark:data-[state=active]:bg-white/[0.06] dark:data-[state=active]:text-white",
);

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

function WorkflowMasterDetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm",
        "dark:border-gray-800 dark:bg-white/[0.03]",
      )}
    >
      {children}
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
      description="管理流程模板与工单实例，回看设计快照并推进审批发布（GOV-003~004）。"
      actions={<CreateWorkflowTemplateDialog onCreated={setSelectedId} />}
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList variant="enclosed" className="w-fit">
          <TabsTrigger value="templates" className={TAB_TRIGGER_CLASS}>
            流程模板
          </TabsTrigger>
          <TabsTrigger value="instances" className={TAB_TRIGGER_CLASS}>
            工单实例
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-0 focus-visible:outline-hidden">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[72px] w-full rounded-2xl" />
              <Skeleton className="h-[520px] w-full rounded-2xl" />
            </div>
          ) : items.length === 0 ? (
            <WorkflowEmptyState />
          ) : (
            <WorkflowMasterDetailShell>
              <WorkflowMetrics templates={items} selected={selected} />
              <div className="grid min-h-[520px] lg:grid-cols-[minmax(280px,320px)_1fr]">
                <aside className="flex flex-col border-b border-gray-200 lg:border-r lg:border-b-0 dark:border-gray-800">
                  <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                      模板列表
                    </h2>
                    <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                      {items.length} 个流程模板
                    </p>
                  </div>
                  <div className="min-h-0 flex-1">
                    <WorkflowTemplateList
                      templates={items}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  </div>
                </aside>
                <section className="min-h-[420px] min-w-0">
                  {selected ? <WorkflowTemplateDetail template={selected} /> : null}
                </section>
              </div>
            </WorkflowMasterDetailShell>
          )}
        </TabsContent>

        <TabsContent value="instances" className="mt-0 focus-visible:outline-hidden">
          <WorkflowInstancesPanel />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}

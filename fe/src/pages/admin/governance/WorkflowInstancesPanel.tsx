import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type WorkflowInstance = {
  id: string;
  templateId: string;
  refId: string;
  status: string;
  allowedActions: string[];
  designSnapshot?: Record<string, unknown>;
};

const STATUS_COLOR: Record<string, "primary" | "success" | "warning" | "light"> = {
  draft: "light",
  pending_approval: "warning",
  designing: "primary",
  pending_publish: "warning",
  published: "success",
};

export function WorkflowInstancesPanel() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.gov.workflowInstances(),
    queryFn: () =>
      apiFetch<{ items: WorkflowInstance[]; total: number }>("/api/v1/gov/workflow/instances"),
  });

  const items = listQuery.data?.items ?? [];

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const detailQuery = useQuery({
    queryKey: queryKeys.gov.workflowInstance(selectedId ?? "", true),
    enabled: Boolean(selectedId),
    queryFn: () =>
      apiFetch<WorkflowInstance>(
        `/api/v1/gov/workflow/instances/${selectedId}?includeDesignSnapshot=true`,
      ),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, action, actorRole }: { id: string; action: string; actorRole: string }) =>
      apiFetch(`/api/v1/gov/workflow/instances/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ action, actorRole }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowInstances() });
      if (selectedId) {
        void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowInstance(selectedId, true) });
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/gov/workflow/instances/${id}/confirm-design`, { method: "POST" }),
    onSuccess: () => {
      toast.success("设计已确认");
      void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowInstances() });
      if (selectedId) {
        void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowInstance(selectedId, true) });
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/v1/gov/publish/from-workflow", {
        method: "POST",
        body: JSON.stringify({ workflowInstanceId: id }),
      }),
    onSuccess: () => {
      toast.success("发布服务已创建");
      void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowInstances() });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const detail = detailQuery.data;
  const snap = detail?.designSnapshot;

  if (listQuery.isLoading) {
    return <Skeleton className="h-[480px] w-full rounded-xl" />;
  }

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-theme-sm text-gray-500 dark:border-gray-700">
        暂无工单实例，请先在查询设计器提交申请。
      </p>
    );
  }

  return (
    <div className="grid min-h-[480px] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm lg:grid-cols-[300px_1fr] dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 lg:border-r lg:border-b-0 dark:border-gray-800">
        <ul className="max-h-[520px] overflow-y-auto">
          {items.map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                className={`w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                  selectedId === inst.id ? "bg-brand-50/50 dark:bg-brand-500/10" : ""
                }`}
                onClick={() => setSelectedId(inst.id)}
              >
                <p className="truncate font-mono text-theme-xs text-gray-800 dark:text-white/90">
                  {inst.id.slice(0, 8)}…
                </p>
                <Badge variant="light" color={STATUS_COLOR[inst.status] ?? "light"} size="sm" className="mt-1">
                  {inst.status}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 space-y-4 p-4">
        {detailQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}
        {detail ? (
          <>
            <div className="flex flex-wrap gap-2">
              {detail.allowedActions.includes("approve") ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={transitionMutation.isPending}
                  onClick={() =>
                    transitionMutation.mutate({
                      id: detail.id,
                      action: "approve",
                      actorRole: "approver",
                    })
                  }
                >
                  审批通过
                </Button>
              ) : null}
              {detail.status === "designing" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(detail.id)}
                >
                  确认设计
                </Button>
              ) : null}
              {detail.status === "pending_publish" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate(detail.id)}
                >
                  发布服务
                </Button>
              ) : null}
            </div>
            {snap ? (
              <div className="space-y-3 rounded-xl bg-gray-50/50 p-4 dark:bg-white/[0.02]">
                <h4 className="text-theme-sm font-medium text-gray-800 dark:text-white/90">配置快照（只读）</h4>
                <Textarea
                  readOnly
                  className="min-h-[120px] font-mono text-theme-xs"
                  value={JSON.stringify(snap.conditions ?? {}, null, 2)}
                  aria-label="条件快照"
                />
                <Textarea
                  readOnly
                  className="min-h-[100px] font-mono text-theme-xs"
                  value={JSON.stringify(snap.computeRules ?? {}, null, 2)}
                  aria-label="规则快照"
                />
                <Textarea
                  readOnly
                  className="min-h-[100px] font-mono text-theme-xs"
                  value={JSON.stringify(snap.outputFields ?? {}, null, 2)}
                  aria-label="输出快照"
                />
              </div>
            ) : (
              <p className="text-theme-sm text-gray-500">该实例暂无设计快照。</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

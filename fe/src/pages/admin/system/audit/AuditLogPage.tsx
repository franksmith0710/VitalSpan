import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type AuditEventOut = {
  id: string;
  actor_id: string;
  actor_username: string | null;
  target_type: string;
  target_id: string;
  action: string;
  detail: string | null;
  trace_id: string;
  created_at: string;
};

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

export function AuditLogPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [debounced, setDebounced] = useState({ action: "", targetType: "" });

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebounced({ action: action.trim(), targetType: targetType.trim() }),
      300,
    );
    return () => window.clearTimeout(t);
  }, [action, targetType]);

  const params = useMemo(() => {
    const p: Record<string, string> = { limit: "50", offset: "0" };
    if (debounced.action) p.action = debounced.action;
    if (debounced.targetType) p.target_type = debounced.targetType;
    return p;
  }, [debounced]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.audit.events(params),
    queryFn: () => {
      const q = new URLSearchParams(params);
      return apiFetch<{ items: AuditEventOut[]; total: number }>(`/api/v1/audit/events?${q}`);
    },
  });

  return (
    <AdminPageShell title="审计日志" description="查询平台操作审计事件（仅管理员可见）。">
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="audit-action">操作</Label>
          <Input
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="如 user.create"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="audit-target-type">目标类型</Label>
          <Input
            id="audit-target-type"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            placeholder="如 role"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[960px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">时间</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作者</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">目标</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">详情</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && (data?.items.length ?? 0) === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                  暂无审计记录
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data?.items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {new Date(row.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white/90">
                      {row.actor_username ?? row.actor_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-theme-xs">{row.action}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {row.target_type}
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="font-mono text-theme-xs">{row.target_id.slice(0, 8)}…</span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-500 dark:text-gray-400">
                      {row.detail ?? "—"}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
      {data?.total != null ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">共 {data.total} 条</p>
      ) : null}
    </AdminPageShell>
  );
}

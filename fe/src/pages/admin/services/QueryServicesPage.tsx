import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type QueryService = {
  id: string;
  name: string;
  httpMethod: string;
  path: string;
  status: string;
  version: string;
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

export function QueryServicesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: () =>
      apiFetch<{ items: QueryService[]; total: number }>("/api/v1/services?limit=100&offset=0"),
  });

  const executeMutation = useMutation({
    mutationFn: (serviceId: string) =>
      apiFetch<{ columns: string[]; rows: unknown[][]; rowCount: number }>(
        `/api/v1/services/${serviceId}/execute`,
        { method: "POST", body: JSON.stringify({ parameters: {} }) },
      ),
    onSuccess: (result) => {
      toast.success(`执行成功，返回 ${result.rowCount} 行`);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="查询服务"
      description="浏览已发布的治理查询服务，并试执行验证（IF-02）。"
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">服务</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">接口</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {items.map((svc) => (
              <tr key={svc.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{svc.name}</td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {svc.httpMethod} {svc.path}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="light" color={svc.status === "published" ? "success" : "light"} size="sm">
                    {svc.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={executeMutation.isPending && activeId === svc.id}
                    onClick={() => {
                      setActiveId(svc.id);
                      executeMutation.mutate(svc.id);
                    }}
                  >
                    <Play className="size-4" aria-hidden />
                    试执行
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && items.length === 0 ? (
          <p className="px-4 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            暂无已发布查询服务。请先在发布流水线中批准 catalog 条目。
          </p>
        ) : null}
      </div>
    </AdminPageShell>
  );
}

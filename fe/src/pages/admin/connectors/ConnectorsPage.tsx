import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type ConnectorType = {
  type: string;
  displayName: string;
  category: string;
  capabilities: string[];
};

type ConnectorTypeListResponse = {
  items: ConnectorType[];
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

export function ConnectorsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.connectorTypes,
    queryFn: () => apiFetch<ConnectorTypeListResponse>("/api/v1/datasources/types"),
  });

  return (
    <AdminPageShell
      title="连接器类型"
      description="查看平台已注册的连接器类型与能力清单（只读）。"
    >
      {isError ? (
        <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名称</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">类型标识</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">分类</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">能力</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3" colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && data?.items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                  暂无已注册连接器类型
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data?.items.map((item) => (
                  <tr
                    key={item.type}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {item.displayName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.type}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.capabilities.map((cap) => (
                          <Badge key={cap} variant="light" color="primary">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

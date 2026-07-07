import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type CatalogEntry = {
  id: string;
  name: string;
  httpMethod: string;
  path: string;
  status: string;
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

const STATUS_COLOR: Record<string, "primary" | "success" | "warning" | "light"> = {
  draft: "light",
  pending_publish: "warning",
  published: "success",
};

export function GovernancePublishPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.gov.entries({ limit: 100, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: CatalogEntry[]; total: number }>(
        "/api/v1/gov/catalog/entries?limit=100&offset=0",
      ),
  });

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="发布流水线"
      description="浏览 catalog 条目发布状态，后续可在此发起 submit / approve（GOV-005）。"
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">条目</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">接口</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">发布状态</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {items.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{e.name}</td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {e.httpMethod} {e.path}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="light" color={STATUS_COLOR[e.status] ?? "light"} size="sm">
                    {e.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

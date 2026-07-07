import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type SqlModeCapabilities = {
  allowedStatements: string[];
  maxSqlLength: number;
  highlightSupported: boolean;
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

export function DesignerPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.designer.sqlCapabilities,
    queryFn: () => apiFetch<SqlModeCapabilities>("/api/v1/designer/sql-mode/capabilities"),
  });

  return (
    <AdminPageShell
      title="查询设计器"
      description="可视化/SQL 查询设计能力入口（DESIGN-001~005）；当前展示 SQL 模式能力契约。"
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {isLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : null}
        {data ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">允许语句</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {data.allowedStatements.map((s) => (
                  <Badge key={s} variant="light" color="primary" size="sm">
                    {s}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">最大 SQL 长度</dt>
              <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {data.maxSqlLength.toLocaleString()} 字符
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">语法高亮</dt>
              <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {data.highlightSupported ? "支持" : "暂不支持"}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        完整设计器（条件、输出字段、运算规则、工单关联）将在四期里程碑与 Dashboard 构建器深度集成。
      </p>
    </AdminPageShell>
  );
}

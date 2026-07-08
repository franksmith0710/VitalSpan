import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, LayoutDashboard, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, IconButton } from "@/components/ui/button";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { canEditDashboards, sessionUserFromMe } from "@/lib/session";
import { useAuth } from "@/context/auth-context";

type DashboardSummary = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
};

type DashboardListResponse = {
  items: DashboardSummary[];
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

export function DashboardListPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "用户", roles: ["viewer"] });
  const canEdit = canEditDashboards(sessionUser);
  const [items, setItems] = useState<DashboardSummary[]>([]);
  const [datasourceCount, setDatasourceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardListResponse>("/api/v1/dashboards");
      setItems(data.items);
      if (sessionUser.roles.includes("admin")) {
        try {
          const ds = await apiFetch<{ items: unknown[] }>("/api/v1/datasources");
          setDatasourceCount(ds.items.length);
        } catch {
          setDatasourceCount(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const slug = `dash-${Date.now()}`;
      const created = await apiFetch<{ id: string }>("/api/v1/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: "新建 Dashboard", slug }),
      });
      navigate(`/admin/dashboards/${created.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {canEdit ? "管理数据看板与布局" : "查看已授权的数据看板"}
          </p>
        </div>
        {!canEdit ? null : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            新建 Dashboard
          </Button>
        )}
      </div>

      {!loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">Dashboard</p>
            <p className="mt-1 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">
              {items.length}
            </p>
          </div>
          {datasourceCount !== null ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">数据源</p>
              <p className="mt-1 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {datasourceCount}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <PanelEmptyState
            icon={<LayoutDashboard className="size-7" aria-hidden />}
            title="暂无 Dashboard"
            description="创建第一个 Dashboard，拖拽组件并配置数据源后即可在预览模式查看图表。"
            action={
              !canEdit ? null : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleCreate()}
                >
                  新建 Dashboard
                </Button>
              )
            }
            size="lg"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-theme-sm">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">名称</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium">更新时间</th>
                  <th className="px-6 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white/90">{row.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{row.slug}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(row.updatedAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-6 py-4">
                      <IconButton
                        asChild
                        variant="ghost"
                        size="sm"
                        aria-label={canEdit ? "编辑" : "查看"}
                      >
                        <Link
                          to={
                            canEdit
                              ? `/admin/dashboards/${row.id}/edit`
                              : `/admin/dashboards/${row.id}`
                          }
                        >
                          {canEdit ? (
                            <Eye className="size-4" />
                          ) : (
                            <Pencil className="size-4" />
                          )}
                        </Link>
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

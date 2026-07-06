import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canEditDashboards, sessionUserFromAuth } from "@/lib/session";
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
    ? sessionUserFromAuth(authUser.username, authUser.roles)
    : sessionUserFromAuth("用户", ["viewer"]);
  const canEdit = canEditDashboards(sessionUser);
  const [items, setItems] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardListResponse>("/api/v1/dashboards");
      setItems(data.items);
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
      <nav className="text-theme-sm text-gray-500 dark:text-gray-400" aria-label="面包屑">
        <span>{canEdit ? "管理" : "分析"}</span>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-white/90">Dashboard</span>
      </nav>

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
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            新建 Dashboard
          </Button>
        )}
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">暂无 Dashboard</p>
            {!canEdit ? null : (
              <Button
                type="button"
                variant="primary"
                disabled={creating}
                onClick={() => void handleCreate()}
              >
                新建 Dashboard
              </Button>
            )}
          </div>
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

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type DataSourceOut = {
  id: string;
  name: string;
  code: string;
  type: string;
  host: string;
  port: number;
  database: string;
};

type DataSourceListResponse = {
  items: DataSourceOut[];
  total: number;
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

export function DatasourceListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DataSourceOut | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listParams = useMemo(
    () => (debouncedQ ? { q: debouncedQ } : undefined),
    [debouncedQ],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasources.list(listParams),
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      const qs = params.toString();
      return apiFetch<DataSourceListResponse>(
        `/api/v1/datasources${qs ? `?${qs}` : ""}`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/datasources/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasources.all });
    },
    onError: (err) => setDeleteError(mapApiError(err)),
  });

  return (
    <AdminPageShell
      title="数据源"
      description="管理外部数据库连接，供查询与 Dashboard 使用。"
      actions={
        <Button asChild variant="primary">
          <Link to="/admin/datasources/new">新建数据源</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="max-w-md"
          placeholder="搜索名称或标识…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索数据源"
        />
      </div>

      {isError ? (
        <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}
      {deleteError ? (
        <ErrorBanner message={deleteError} onRetry={() => setDeleteError(null)} />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">名称</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">标识</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">类型</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">主机</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && data?.items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                  暂无数据源
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data?.items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.type}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {row.host}:{row.port}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton asChild variant="ghost" size="sm" aria-label="查看">
                          <Link to={`/admin/datasources/${row.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton asChild variant="ghost" size="sm" aria-label="编辑">
                          <Link to={`/admin/datasources/${row.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="删除"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(row);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除数据源？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」。若数据源仍被引用，删除将失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}

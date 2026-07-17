import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Monitor, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DashboardListCard,
  DashboardListCardSkeleton,
  type DashboardListItem,
} from "@/components/dashboard/DashboardListCard";
import {
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
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
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { buildDashboardsListUrl } from "@/lib/dashboardsListQuery";
import {
  buildDefaultDataScreenLayout,
  dataScreenEditPath,
} from "@/lib/dataScreenLayout";
import { queryKeys } from "@/lib/queryKeys";
import { useListPagination } from "@/lib/list-pagination";
import { canEditDashboards, sessionUserFromMe } from "@/lib/session";
import { useAuth } from "@/context/auth-context";

type DashboardListResponse = {
  items: DashboardListItem[];
  total: number;
  limit: number;
  offset: number;
};

function sortByRecent(items: DashboardListItem[]): DashboardListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function DataScreenListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "用户", roles: ["viewer"] });
  const canEdit = canEditDashboards(sessionUser);
  const [deleteTarget, setDeleteTarget] = useState<DashboardListItem | null>(null);
  const pagination = useListPagination();

  const listQuery = useQuery({
    queryKey: queryKeys.dashboards.list({
      limit: pagination.pageSize,
      offset: pagination.offset,
      surfaceKind: "data-screen",
    }),
    queryFn: () =>
      apiFetch<DashboardListResponse>(
        buildDashboardsListUrl({
          limit: pagination.pageSize,
          offset: pagination.offset,
          surfaceKind: "data-screen",
        }),
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = `screen-${Date.now()}`;
      const created = await apiFetch<{ id: string }>("/api/v1/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: "未命名大屏", slug }),
      });
      try {
        await apiFetch(`/api/v1/dashboards/${created.id}/layout`, {
          method: "PUT",
          body: JSON.stringify({ layoutJson: buildDefaultDataScreenLayout() }),
        });
      } catch (layoutErr) {
        try {
          await apiFetch(`/api/v1/dashboards/${created.id}`, { method: "DELETE" });
        } catch {
          // best-effort rollback
        }
        throw layoutErr;
      }
      return created;
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      navigate(dataScreenEditPath(created.id));
    },
    onError: (err) => {
      toast.error(mapApiError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (dashboardId: string) =>
      apiFetch(`/api/v1/dashboards/${dashboardId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("大屏已删除");
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    },
    onError: (err) => {
      toast.error(mapApiError(err));
    },
  });

  const sortedItems = useMemo(
    () => sortByRecent(listQuery.data?.items ?? []),
    [listQuery.data?.items],
  );
  const total = listQuery.data?.total ?? 0;

  const createButton = canEdit ? (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={createMutation.isPending}
      onClick={() => createMutation.mutate()}
    >
      <Plus className="size-4" />
      新建大屏
    </Button>
  ) : null;

  return (
    <AdminPageShell
      layout="list"
      title="数据大屏"
      description="16:9 深色可视化大屏，对标 DataEase 数据大屏；复用像素画布编辑与发布。"
      actions={createButton}
    >
      <ListPageSection>
        {listQuery.isError ? (
          <PageErrorBanner
            message={mapApiError(listQuery.error)}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}

        <ListPageTableFrame>
          {listQuery.isLoading ? (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <DashboardListCardSkeleton key={index} />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center dark:border-gray-800">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                <Monitor className="size-7" aria-hidden />
              </div>
              <h2 className="mt-4 text-theme-sm font-semibold text-gray-900 dark:text-white">
                暂无数据大屏
              </h2>
              <p className="mt-2 max-w-md text-theme-sm text-gray-500 dark:text-gray-400">
                创建 1920×1080 深色画布，拖拽图表与 KPI 组件，用于指挥大厅与监控墙展示。
              </p>
              {createButton ? <div className="mt-6">{createButton}</div> : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedItems.map((screen) => (
                  <DashboardListCard
                    key={screen.id}
                    dashboard={screen}
                    canEdit={canEdit}
                    routeBase="/admin/data-screens"
                    onDelete={() => setDeleteTarget(screen)}
                  />
                ))}
              </div>
              <ListPagePagination
                total={total}
                pageSize={pagination.pageSize}
                page={pagination.page}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                entityLabel="个大屏"
              />
            </>
          )}
        </ListPageTableFrame>
      </ListPageSection>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除大屏</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.name}」？删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
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

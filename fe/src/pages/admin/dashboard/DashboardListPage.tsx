import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Eye, LayoutGrid, LayoutList, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListBatchDeleteBar,
  ListHeaderCheckbox,
  ListRowCheckbox,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DashboardListCard,
  DashboardListCardSkeleton,
  DashboardListEmptyIcon,
  type DashboardListItem,
} from "@/components/dashboard/DashboardListCard";
import { DashboardQuickCreateDialog } from "@/components/dashboard/DashboardQuickCreateDialog";
import {
  DataTable,
  ListPageBody,
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  PageErrorBanner,
  RowActions,
} from "@/components/layout/list-page-kit";
import { Button, IconButton } from "@/components/ui/button";
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
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useListPagination } from "@/lib/list-pagination";
import { canEditDashboards, sessionUserFromMe } from "@/lib/session";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
import { useAuth } from "@/context/auth-context";

type DashboardListResponse = {
  items: DashboardListItem[];
  total: number;
  limit: number;
  offset: number;
};

type ViewMode = "grid" | "list";

function sortByRecent(items: DashboardListItem[]): DashboardListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN");
}

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-gray-100/80 p-0.5 dark:border-gray-800 dark:bg-white/[0.04]"
      role="group"
      aria-label="看板视图切换"
    >
      <Button
        type="button"
        variant={viewMode === "grid" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={viewMode === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="size-4" aria-hidden />
        卡片
      </Button>
      <Button
        type="button"
        variant={viewMode === "list" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={viewMode === "list"}
        onClick={() => onChange("list")}
      >
        <LayoutList className="size-4" aria-hidden />
        列表
      </Button>
    </div>
  );
}

export function DashboardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "用户", roles: ["viewer"] });
  const canEdit = canEditDashboards(sessionUser);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<DashboardListItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const pagination = useListPagination();

  const listQuery = useQuery({
    queryKey: queryKeys.dashboards.list({
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    queryFn: () =>
      apiFetch<DashboardListResponse>(
        `/api/v1/dashboards?limit=${pagination.pageSize}&offset=${pagination.offset}`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = `dash-${Date.now()}`;
      return apiFetch<{ id: string }>("/api/v1/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: "未命名看板", slug }),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      navigate(`/admin/dashboards/${created.id}/edit`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (dashboardId: string) =>
      apiFetch(`/api/v1/dashboards/${dashboardId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? items.length;
  const sortedItems = useMemo(() => sortByRecent(items), [items]);
  const rowIds = useMemo(() => sortedItems.map((item) => item.id), [sortedItems]);
  const selection = useListRowSelection(rowIds);

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/dashboards/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    if (failed === 0) toast.success(`已删除 ${ok} 个看板`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  const createButton = canEdit ? (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={createMutation.isPending}
      onClick={() => setQuickCreateOpen(true)}
    >
      <Plus className="size-4" />
      新建看板
    </Button>
  ) : null;

  return (
    <AdminPageShell
      layout="list"
      title="数据看板"
      description={
        canEdit
          ? "创建并管理可视化看板，拖拽组件、绑定数据源后发布给业务用户。"
          : "浏览已授权的数据看板，点击进入查看模式。"
      }
      actions={
        <>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          {createButton}
        </>
      }
    >
      <ListPageSection>
        {canEdit ? (
          <ListPageBody className="border-b border-gray-100 py-3 dark:border-white/[0.06]">
            <ListBatchDeleteBar
              selectedCount={selection.selectedCount}
              entityLabel="个看板"
              onClear={selection.clear}
              onDelete={() => setBatchDeleteOpen(true)}
            />
          </ListPageBody>
        ) : null}
        {listQuery.isError ? (
          <ListPageBody>
            <PageErrorBanner
              message={mapApiError(listQuery.error)}
              onRetry={() => void listQuery.refetch()}
            />
          </ListPageBody>
        ) : null}

        {viewMode === "grid" ? (
          <ListPageTableFrame>
            {listQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <DashboardListCardSkeleton key={index} />
                ))}
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center dark:border-gray-800">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                  <DashboardListEmptyIcon />
                </div>
                <h2 className="mt-4 text-theme-sm font-semibold text-gray-900 dark:text-white">
                  暂无 Dashboard
                </h2>
                <p className="mt-2 max-w-md text-theme-sm text-gray-500 dark:text-gray-400">
                  创建第一个看板，拖拽图表组件并绑定数据源后即可发布。
                </p>
                {createButton ? <div className="mt-6">{createButton}</div> : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {sortedItems.map((dashboard) => (
                    <DashboardListCard
                      key={dashboard.id}
                      dashboard={dashboard}
                      canEdit={canEdit}
                      selected={selection.isSelected(dashboard.id)}
                      onToggleSelect={
                        canEdit ? () => selection.toggle(dashboard.id) : undefined
                      }
                      onDelete={canEdit ? () => setDeleteTarget(dashboard) : undefined}
                    />
                  ))}
                </div>
                <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
                  共 {total} 个看板
                  {items.length < total ? "（当前页未加载全部）" : ""}
                  ，按最近更新排序
                </p>
              </>
            )}
          </ListPageTableFrame>
        ) : (
          <ListPageTableFrame>
          <DataTable
            loading={listQuery.isLoading}
            empty={!listQuery.isLoading && sortedItems.length === 0}
            headers={[
              canEdit ? (
                <ListHeaderCheckbox
                  key="select-all"
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  disabled={sortedItems.length === 0}
                  onCheckedChange={() => selection.toggleAll()}
                />
              ) : (
                ""
              ),
              "名称",
              "组件数",
              "更新时间",
              "操作",
            ]}
            lastColumnAlign="right"
            emptyState={{
              icon: <DashboardListEmptyIcon />,
              title: "暂无 Dashboard",
              description: "创建第一个看板，拖拽图表组件并绑定数据源后即可发布。",
              action: createButton,
            }}
            rows={sortedItems.map((row) => {
              const widgetCount = row.layoutJson?.widgets?.length ?? 0;
              const viewPath = `/admin/dashboards/${row.id}`;
              const editPath = `/admin/dashboards/${row.id}/edit`;

              return [
                canEdit ? (
                  <ListRowCheckbox
                    key={`${row.id}-select`}
                    checked={selection.isSelected(row.id)}
                    onCheckedChange={() => selection.toggle(row.id)}
                    ariaLabel={`选择看板 ${row.name}`}
                  />
                ) : (
                  ""
                ),
                <div key={`${row.id}-name`} className="min-w-0">
                  <Link
                    to={canEdit ? editPath : viewPath}
                    className="block truncate font-medium text-gray-800 hover:text-brand-600 dark:text-white/90 dark:hover:text-brand-400"
                  >
                    {row.name}
                  </Link>
                  <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    {row.description ?? row.slug}
                  </p>
                </div>,
                String(widgetCount),
                formatUpdatedAt(row.updatedAt),
                <RowActions key={`${row.id}-actions`}>
                  <IconButton asChild variant="ghost" size="sm" aria-label="查看">
                    <Link to={viewPath}>
                      <Eye className="size-4" />
                    </Link>
                  </IconButton>
                  {canEdit ? (
                    <>
                      <IconButton asChild variant="ghost" size="sm" aria-label="编辑">
                        <Link to={editPath}>
                          <Pencil className="size-4" />
                        </Link>
                      </IconButton>
                      <IconButton asChild variant="ghost" size="sm" aria-label="分享">
                        <Link to={`/admin/dashboards/${row.id}/share`}>
                          <Share2 className="size-4" />
                        </Link>
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label="删除"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </>
                  ) : null}
                </RowActions>,
              ];
            })}
          />
          </ListPageTableFrame>
        )}

        {!listQuery.isLoading && total > 0 ? (
          <ListPagePagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger
            onChange={pagination.onPageChange}
          />
        ) : null}
      </ListPageSection>

      {createMutation.isError ? (
        <PageErrorBanner
          message={mapApiError(createMutation.error)}
          onRetry={() => createMutation.reset()}
        />
      ) : null}
      {deleteMutation.isError ? (
        <PageErrorBanner
          message={mapApiError(deleteMutation.error)}
          onRetry={() => deleteMutation.reset()}
        />
      ) : null}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除看板</AlertDialogTitle>
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

      {canEdit ? (
        <BatchDeleteDialog
          open={batchDeleteOpen}
          onOpenChange={setBatchDeleteOpen}
          count={selection.selectedCount}
          title="批量删除看板"
          description={`确定删除选中的 ${selection.selectedCount} 个看板？删除后无法恢复。`}
          pending={batchDeleting}
          onConfirm={() => void handleBatchDelete()}
        />
      ) : null}

      {canEdit ? (
        <DashboardQuickCreateDialog
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
          onBlankCreate={() => createMutation.mutate()}
          blankPending={createMutation.isPending}
        />
      ) : null}
    </AdminPageShell>
  );
}

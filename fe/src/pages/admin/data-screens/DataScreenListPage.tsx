import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ChevronDown, Eye, LayoutGrid, LayoutList, LayoutTemplate, Monitor, Pencil, Plus, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListHeaderCheckbox,
  ListPageBatchActions,
  ListRowCheckbox,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DashboardListCard,
  DashboardListCardSkeleton,
  type DashboardListItem,
} from "@/components/dashboard/DashboardListCard";
import {
  DataTable,
  ListPageBody,
  ListPageCardGridEmptyState,
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
  RowActions,
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
import { Button, IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { buildDashboardsListUrl } from "@/lib/dashboardsListQuery";
import {
  buildDataScreenLayoutFromTemplate,
  parseImportedDataScreenLayout,
  type DataScreenTemplateId,
} from "@/lib/dataScreenTemplates";
import { createFromTemplate, type DashboardTemplateListItem } from "@/lib/dashboardTemplates";
import { TemplatePickerDialog } from "@/components/dashboard/templates/TemplatePickerDialog";
import {
  dashboardSharePath,
  dataScreenEditPath,
  dataScreenPreviewPath,
} from "@/lib/dataScreenLayout";
import { queryKeys } from "@/lib/queryKeys";
import { useListPagination } from "@/lib/list-pagination";
import { runBatchDelete } from "@/lib/runBatchDelete";
import { canEditDashboards, sessionUserFromMe } from "@/lib/session";
import { useListRowSelection } from "@/hooks/useListRowSelection";
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
      aria-label="大屏视图切换"
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

export function DataScreenListPage() {
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
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
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
    mutationFn: async (templateId: DataScreenTemplateId = "blank") => {
      const slug = `screen-${Date.now()}`;
      const created = await apiFetch<{ id: string }>("/api/v1/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: "未命名大屏", slug }),
      });
      try {
        await apiFetch(`/api/v1/dashboards/${created.id}/layout`, {
          method: "PUT",
          body: JSON.stringify({
            layoutJson: buildDataScreenLayoutFromTemplate(templateId),
          }),
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

  const fromTemplateMutation = useMutation({
    mutationFn: (template: DashboardTemplateListItem) =>
      createFromTemplate(template.id, "未命名大屏"),
    onSuccess: (created) => {
      setTemplatePickerOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      navigate(dataScreenEditPath(created.id));
    },
    onError: (err) => {
      toast.error(mapApiError(err));
    },
  });

  const importMutation = useMutation({
    mutationFn: async (layoutJson: ReturnType<typeof parseImportedDataScreenLayout>) => {
      const slug = `screen-import-${Date.now()}`;
      const created = await apiFetch<{ id: string }>("/api/v1/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: "导入的大屏", slug }),
      });
      try {
        await apiFetch(`/api/v1/dashboards/${created.id}/layout`, {
          method: "PUT",
          body: JSON.stringify({ layoutJson }),
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
      toast.success("布局已导入");
      navigate(dataScreenEditPath(created.id));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : mapApiError(err));
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
  const rowIds = useMemo(() => sortedItems.map((item) => item.id), [sortedItems]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);

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
    if (failed === 0) toast.success(`已删除 ${ok} 个大屏`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  const createButton = canEdit ? (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={createMutation.isPending || importMutation.isPending || fromTemplateMutation.isPending}
          >
            <Plus className="size-4" />
            新建大屏
            <ChevronDown className="size-4 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem onClick={() => createMutation.mutate("blank")}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">空白大屏</span>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                1920×1080 深色画布
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTemplatePickerOpen(true)}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">从模板库选择</span>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                浏览企业内可视化模板
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={createMutation.isPending || importMutation.isPending}
        onClick={() => importInputRef.current?.click()}
      >
        <Upload className="size-4" />
        导入 JSON
      </Button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const parsed = JSON.parse(String(reader.result ?? ""));
              const layoutJson = parseImportedDataScreenLayout(parsed);
              importMutation.mutate(layoutJson);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "无法解析布局 JSON");
            }
          };
          reader.readAsText(file);
        }}
      />
    </div>
  ) : null;

  return (
    <AdminPageShell
      layout="list"
      title="数据大屏"
      description="16:9 深色可视化大屏，对标 DataEase 数据大屏；复用像素画布编辑与发布。"
      actions={
        <>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          {createButton}
        </>
      }
    >
      <ListPageSection>
        {canEdit ? (
          <ListPageToolbar
            actions={
              <ListPageBatchActions
                batchMode={batch.batchMode}
                onToggleBatchMode={batch.toggleBatchMode}
                selectedCount={selection.selectedCount}
                entityLabel="个大屏"
                onClear={selection.clear}
                onDelete={() => setBatchDeleteOpen(true)}
              />
            }
          />
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
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <DashboardListCardSkeleton key={index} />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <ListPageCardGridEmptyState
              icon={<Monitor className="size-7" aria-hidden />}
              title="暂无数据大屏"
              description="创建 1920×1080 深色画布，拖拽图表与 KPI 组件，用于指挥大厅与监控墙展示。"
              action={createButton}
              headingId="data-screen-empty-title"
              layout="data-screen"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedItems.map((screen) => (
                  <DashboardListCard
                    key={screen.id}
                    dashboard={screen}
                    canEdit={canEdit}
                    routeBase="/admin/data-screens"
                    selected={selection.isSelected(screen.id)}
                    onToggleSelect={
                      canEdit && batch.batchMode
                        ? () => selection.toggle(screen.id)
                        : undefined
                    }
                    onDelete={canEdit ? () => setDeleteTarget(screen) : undefined}
                  />
                ))}
              </div>
              <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
                共 {total} 个大屏
                {(listQuery.data?.items.length ?? 0) < total ? "（当前页未加载全部）" : ""}
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
                ...(canEdit && batch.batchMode
                  ? [
                      <ListHeaderCheckbox
                        key="select-all"
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        disabled={sortedItems.length === 0}
                        onCheckedChange={() => selection.toggleAll()}
                      />,
                    ]
                  : []),
                "名称",
                "组件数",
                "更新时间",
                "操作",
              ]}
              lastColumnAlign="right"
              emptyState={{
                icon: <Monitor className="size-7" aria-hidden />,
                title: "暂无数据大屏",
                description: "创建 1920×1080 深色画布，拖拽图表与 KPI 组件，用于指挥大厅与监控墙展示。",
                action: createButton,
                layout: "data-screen",
              }}
              rows={sortedItems.map((row) => {
                const widgetCount = row.widgetCount ?? row.previewSummary?.widgets?.length ?? row.layoutJson?.widgets?.length ?? 0;
                const viewPath = dataScreenPreviewPath(row.id);
                const editPath = dataScreenEditPath(row.id);
                const sharePath = dashboardSharePath(row.id, true);

                return [
                  ...(canEdit && batch.batchMode
                    ? [
                        <ListRowCheckbox
                          key={`${row.id}-select`}
                          checked={selection.isSelected(row.id)}
                          onCheckedChange={() => selection.toggle(row.id)}
                          ariaLabel={`选择大屏 ${row.name}`}
                        />,
                      ]
                    : []),
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
                          <Link to={sharePath}>
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

      {canEdit ? (
        <BatchDeleteDialog
          open={batchDeleteOpen}
          onOpenChange={setBatchDeleteOpen}
          count={selection.selectedCount}
          title="批量删除大屏"
          description={`确定删除选中的 ${selection.selectedCount} 个大屏？删除后无法恢复。`}
          pending={batchDeleting}
          onConfirm={() => void handleBatchDelete()}
        />
      ) : null}

      {canEdit ? (
        <TemplatePickerDialog
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          surfaceKind="data-screen"
          pending={fromTemplateMutation.isPending}
          onSelect={(template) => fromTemplateMutation.mutate(template)}
        />
      ) : null}
    </AdminPageShell>
  );
}

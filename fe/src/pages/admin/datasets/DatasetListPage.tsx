import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListPageBatchActions,
  ListHeaderCheckbox,
  ListRowCheckbox,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import {
  DataTable,
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
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useListPagination } from "@/lib/list-pagination";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isDemoPackageDataset } from "@/lib/demoPackage";

type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: Array<{ name: string }>;
  boundConfigId?: string | null;
  isDemoPackage?: boolean;
};

function matchesDatasetSearch(item: DatasetItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.displayName.toLowerCase().includes(q) ||
    item.datasetId.toLowerCase().includes(q)
  );
}

export function DatasetListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DatasetItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const pagination = useListPagination(20, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasets.list({
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    queryFn: () =>
      apiFetch<{ items: DatasetItem[]; total: number }>(
        `/api/v1/datasets?limit=${pagination.pageSize}&offset=${pagination.offset}`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/datasets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Dataset 已删除");
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["datasets"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(search.trim());
  const filteredItems = useMemo(() => {
    const matched = items.filter((item) => matchesDatasetSearch(item, search));
    return [...matched].sort((a, b) => {
      const aDemo = isDemoPackageDataset(a.datasetId, a.displayName) || a.isDemoPackage ? 1 : 0;
      const bDemo = isDemoPackageDataset(b.datasetId, b.displayName) || b.isDemoPackage ? 1 : 0;
      return bDemo - aDemo || a.displayName.localeCompare(b.displayName, "zh-CN");
    });
  }, [items, search]);
  const rowIds = useMemo(() => filteredItems.map((item) => item.datasetId), [filteredItems]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);
  const isEmpty = !isLoading && filteredItems.length === 0;

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/datasets/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    void qc.invalidateQueries({ queryKey: ["datasets"] });
    if (failed === 0) toast.success(`已删除 ${ok} 个 Dataset`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  const createButton = (
    <Button asChild variant="primary" size="sm">
      <Link to="/admin/datasets/new">
        <Plus className="size-4" aria-hidden />
        新建 Dataset
      </Link>
    </Button>
  );

  return (
    <AdminPageShell
      layout="list"
      title="Dataset"
      icon={
        <AdminPageHeaderIcon>
          <Layers className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="语义层数据集管理。安装后可在列表中看到「【官方示例】」预置数据集（对标 DataEase 数据准备）。"
      actions={createButton}
    >
      <ListPageSection>
        <ListPageToolbar
          filters={
            <div className="grid w-full gap-2 sm:max-w-xs">
              <Label className="sr-only">搜索 Dataset</Label>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="搜索名称或 ID…"
                aria-label="搜索 Dataset"
              />
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <ListPageBatchActions
                batchMode={batch.batchMode}
                onToggleBatchMode={batch.toggleBatchMode}
                selectedCount={selection.selectedCount}
                entityLabel="个 Dataset"
                onClear={selection.clear}
                onDelete={() => setBatchDeleteOpen(true)}
              />
              {!isLoading && hasFilters ? (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  筛选结果 {filteredItems.length} 条
                </p>
              ) : null}
            </div>
          }
        />

        <ListPageTableFrame className={cn(isEmpty && !isLoading ? "px-0" : undefined)}>
          {isError ? (
            <div className="px-5 pb-5">
              <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
            </div>
          ) : (
            <DataTable
              loading={isLoading}
              empty={isEmpty}
              lastColumnAlign="right"
              loadingRows={5}
              emptyState={{
                icon: <Layers className="size-7" aria-hidden />,
                title: hasFilters ? "未找到匹配的 Dataset" : "暂无 Dataset",
                description: hasFilters
                  ? "尝试调整搜索关键词。"
                  : "创建语义层数据集，配置表关联与计算字段。",
                action: hasFilters ? undefined : createButton,
              }}
              headers={[
                ...(batch.batchMode
                  ? [
                      <ListHeaderCheckbox
                        key="select-all"
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        disabled={filteredItems.length === 0}
                        onCheckedChange={() => selection.toggleAll()}
                      />,
                    ]
                  : []),
                "显示名",
                "ID",
                "绑定配置",
                "表数量",
                "操作",
              ]}
              rows={filteredItems.map((d) => [
                ...(batch.batchMode
                  ? [
                      <ListRowCheckbox
                        key={`${d.datasetId}-select`}
                        checked={selection.isSelected(d.datasetId)}
                        onCheckedChange={() => selection.toggle(d.datasetId)}
                        ariaLabel={`选择 Dataset ${d.displayName}`}
                      />,
                    ]
                  : []),
                <span key="n" className="inline-flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-white/90">
                  {d.displayName}
                  {isDemoPackageDataset(d.datasetId, d.displayName) || d.isDemoPackage ? (
                    <Badge variant="light" color="primary" size="sm">
                      官方示例
                    </Badge>
                  ) : null}
                </span>,
                <code
                  key="id"
                  className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/10 dark:text-gray-300"
                >
                  {d.datasetId}
                </code>,
                d.boundConfigId ? `${d.boundConfigId.slice(0, 8)}…` : "—",
                d.tables.length,
                <RowActions key="a">
                  <IconButton asChild variant="ghost" size="sm" aria-label={`编辑 ${d.displayName}`}>
                    <Link to={`/admin/datasets/${d.datasetId}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={`删除 ${d.displayName}`}
                    disabled={isDemoPackageDataset(d.datasetId, d.displayName) || d.isDemoPackage}
                    title={
                      isDemoPackageDataset(d.datasetId, d.displayName) || d.isDemoPackage
                        ? "官方示例 Dataset 不可删除"
                        : undefined
                    }
                    onClick={() => setDeleteTarget(d)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </RowActions>,
              ])}
            />
          )}
        </ListPageTableFrame>

        {!isLoading && total > 0 && !hasFilters ? (
          <ListPagePagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger
            onChange={pagination.onPageChange}
          />
        ) : null}
      </ListPageSection>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 Dataset？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.displayName}」（{deleteTarget?.datasetId}）
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.datasetId)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量删除 Dataset"
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </AdminPageShell>
  );
}

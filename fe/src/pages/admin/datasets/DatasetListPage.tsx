import { useState } from "react";
import { Link } from "react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DataTable,
  ListPageBody,
  ListPagePagination,
  ListPageSection,
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
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useListPagination } from "@/lib/list-pagination";

type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: Array<{ name: string }>;
  boundConfigId?: string | null;
};

export function DatasetListPage() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<DatasetItem | null>(null);
  const pagination = useListPagination(20);

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
      title="Dataset"
      description="语义层数据集管理：表关联、计算字段与授权角色（META-004）。"
      actions={createButton}
    >
      <ListPageSection>
        {isError ? (
          <ListPageBody>
            <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
          </ListPageBody>
        ) : null}
        <ListPageBody>
          <DataTable
            loading={isLoading}
            empty={items.length === 0}
            lastColumnAlign="right"
            emptyState={{
              icon: <Layers className="size-7" aria-hidden />,
              title: "暂无 Dataset",
              description: "创建语义层数据集，配置表关联与计算字段。",
              action: createButton,
            }}
            headers={["显示名", "ID", "绑定配置", "表数量", "操作"]}
            rows={items.map((d) => [
              <span key="n" className="font-medium text-gray-900 dark:text-white/90">
                {d.displayName}
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
                  onClick={() => setDeleteTarget(d)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </RowActions>,
            ])}
          />
        </ListPageBody>

        {!isLoading && total > 0 ? (
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
    </AdminPageShell>
  );
}

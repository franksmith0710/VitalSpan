import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: Array<{ name: string; alias?: string | null }>;
  computedFields: Array<{ name: string; expression: string }>;
  allowedRoles: string[];
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

export function DatasetListPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 100, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetItem[]; total: number }>(
        "/api/v1/datasets?limit=100&offset=0",
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: DatasetItem) =>
      apiFetch("/api/v1/datasets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("Dataset 已创建");
      setOpen(false);
      setDatasetId("");
      setDisplayName("");
      await qc.invalidateQueries({ queryKey: ["datasets"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="Dataset"
      description="语义层数据集管理：表关联、计算字段与授权角色（META-004）。"
      actions={
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          新建 Dataset
        </Button>
      }
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">ID</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">表数量</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">计算字段</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  暂无 Dataset
                </td>
              </tr>
            ) : null}
            {items.map((d) => (
              <tr key={d.datasetId} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                  {d.displayName}
                </td>
                <td className="px-4 py-3 font-mono text-theme-xs">{d.datasetId}</td>
                <td className="px-4 py-3">{d.tables.length}</td>
                <td className="px-4 py-3">{d.computedFields.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建 Dataset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ds-id">Dataset ID</Label>
              <Input id="ds-id" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ds-name">显示名</Label>
              <Input id="ds-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!datasetId.trim() || !displayName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  datasetId: datasetId.trim(),
                  displayName: displayName.trim(),
                  tables: [],
                  computedFields: [],
                  allowedRoles: [],
                })
              }
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

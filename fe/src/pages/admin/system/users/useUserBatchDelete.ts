import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useListBatchMode } from "@/components/layout/list-batch-delete";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { apiFetch } from "@/lib/api";
import { runBatchDelete } from "@/lib/runBatchDelete";

type UserRow = { id: string; username: string };

export function useUserBatchDelete(items: UserRow[], invalidate: () => Promise<void>) {
  const rowIds = useMemo(() => items.map((u) => u.id), [items]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/users/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    await invalidate();
    if (failed === 0) toast.success(`已删除 ${ok} 个用户`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败（可能为超级管理员或当前账号）`);
  };

  return {
    selection,
    batch,
    batchDeleteOpen,
    setBatchDeleteOpen,
    batchDeleting,
    handleBatchDelete,
  };
}

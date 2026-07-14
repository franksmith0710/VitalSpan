import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListHeaderCheckbox,
  ListPageBatchActions,
  ListRowCheckbox,
  listTableSelectCellClass,
  listTableSelectHeadClass,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
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
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { RlsRoleBindingPanel } from "./RlsRoleBindingPanel";
import type { DimensionGroupOut, DimensionTypeOut } from "./rls-types";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

export function RlsAdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dimensions");
  const [dimOpen, setDimOpen] = useState(false);
  const [dimCode, setDimCode] = useState("");
  const [dimName, setDimName] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupDimId, setGroupDimId] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [filterDimId, setFilterDimId] = useState<string>("__all__");
  const [editGroup, setEditGroup] = useState<DimensionGroupOut | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteGroup, setDeleteGroup] = useState<DimensionGroupOut | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [valuesGroup, setValuesGroup] = useState<DimensionGroupOut | null>(null);
  const [valuesText, setValuesText] = useState("");

  const dimensionsQuery = useQuery({
    queryKey: queryKeys.rls.dimensions({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DimensionTypeOut[]; total: number }>(
        "/api/v1/rls/dimensions?limit=200&offset=0",
      ),
  });

  const groupsQuery = useQuery({
    queryKey: queryKeys.rls.groups(filterDimId === "__all__" ? undefined : filterDimId),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "200", offset: "0" });
      if (filterDimId !== "__all__") q.set("dimension_type_id", filterDimId);
      return apiFetch<{ items: DimensionGroupOut[]; total: number }>(
        `/api/v1/rls/groups?${q}`,
      );
    },
    enabled: tab === "groups" || tab === "bindings",
  });

  const valuesQuery = useQuery({
    queryKey: ["rls", "group-values", valuesGroup?.id],
    queryFn: () =>
      apiFetch<{ items: string[] }>(`/api/v1/rls/groups/${valuesGroup!.id}/values`),
    enabled: Boolean(valuesGroup?.id),
  });

  useEffect(() => {
    if (valuesGroup && valuesQuery.data?.items) {
      setValuesText(valuesQuery.data.items.join("\n"));
    }
  }, [valuesGroup, valuesQuery.data]);

  const createDim = useMutation({
    mutationFn: (body: { code: string; name: string; value_type: string }) =>
      apiFetch("/api/v1/rls/dimensions", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("维度类型已创建");
      setDimOpen(false);
      setDimCode("");
      setDimName("");
      await qc.invalidateQueries({ queryKey: ["rls", "dimensions"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const createGroup = useMutation({
    mutationFn: (body: { dimension_type_id: string; code: string; name: string }) =>
      apiFetch("/api/v1/rls/groups", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("维度分组已创建");
      setGroupOpen(false);
      setGroupCode("");
      setGroupName("");
      await qc.invalidateQueries({ queryKey: ["rls", "groups"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const updateGroup = useMutation({
    mutationFn: (body: { id: string; name: string }) =>
      apiFetch(`/api/v1/rls/groups/${body.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: body.name }),
      }),
    onSuccess: async () => {
      toast.success("分组已更新");
      setEditGroup(null);
      await qc.invalidateQueries({ queryKey: ["rls", "groups"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const removeGroup = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/rls/groups/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("分组已删除");
      setDeleteGroup(null);
      await qc.invalidateQueries({ queryKey: ["rls", "groups"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const replaceValues = useMutation({
    mutationFn: (body: { id: string; values: string[] }) =>
      apiFetch(`/api/v1/rls/groups/${body.id}/values`, {
        method: "PUT",
        body: JSON.stringify({ values: body.values }),
      }),
    onSuccess: async () => {
      toast.success("分组成员值已更新");
      setValuesGroup(null);
      setValuesText("");
      await qc.invalidateQueries({ queryKey: ["rls", "group-values"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const openValues = (g: DimensionGroupOut) => {
    setValuesText("");
    setValuesGroup(g);
  };

  const dimensions = dimensionsQuery.data?.items ?? [];
  const groups = groupsQuery.data?.items ?? [];
  const dimNameById = Object.fromEntries(dimensions.map((d) => [d.id, d.name]));
  const groupRowIds = useMemo(() => groups.map((g) => g.id), [groups]);
  const groupSelection = useListRowSelection(groupRowIds);
  const groupBatch = useListBatchMode(groupSelection.clear);
  const groupTableColSpan = groupBatch.batchMode ? 5 : 4;

  const handleBatchDeleteGroups = async () => {
    const ids = [...groupSelection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/rls/groups/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    groupSelection.clear();
    await qc.invalidateQueries({ queryKey: ["rls", "groups"] });
    if (failed === 0) toast.success(`已删除 ${ok} 个维度分组`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  return (
    <AdminPageShell
      title="行级权限"
      description="配置 RLS 维度类型与分组，管理分组成员值，并为角色绑定维度分组。"
    >
      {dimensionsQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(dimensionsQuery.error)}
          onRetry={() => void dimensionsQuery.refetch()}
        />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dimensions">维度类型</TabsTrigger>
          <TabsTrigger value="groups">维度分组</TabsTrigger>
          <TabsTrigger value="bindings">角色绑定</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="primary" size="sm" onClick={() => setDimOpen(true)}>
              <Plus className="size-4" aria-hidden />
              新建维度
            </Button>
          </div>
          <div className="overflow-x-only rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-[640px] w-full text-left text-theme-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">名称</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">编码</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">值类型</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">组织维度</th>
                </tr>
              </thead>
              <tbody>
                {dimensionsQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="px-4 py-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {dimensions.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-theme-xs">{d.code}</td>
                    <td className="px-4 py-3">{d.value_type}</td>
                    <td className="px-4 py-3">
                      {d.org_dimension ? (
                        <Badge variant="light" color="primary" size="sm">
                          是
                        </Badge>
                      ) : (
                        "否"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2 sm:w-64">
              <Label>按维度类型筛选</Label>
              <Select value={filterDimId} onValueChange={setFilterDimId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部</SelectItem>
                  {dimensions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ListPageBatchActions
                batchMode={groupBatch.batchMode}
                onToggleBatchMode={groupBatch.toggleBatchMode}
                selectedCount={groupSelection.selectedCount}
                entityLabel="个分组"
                onClear={groupSelection.clear}
                onDelete={() => setBatchDeleteOpen(true)}
              />
              <Button type="button" variant="primary" size="sm" onClick={() => setGroupOpen(true)}>
                <Plus className="size-4" aria-hidden />
                新建分组
              </Button>
            </div>
          </div>
          <div className="overflow-x-only rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-[720px] w-full text-left text-theme-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  {groupBatch.batchMode ? (
                    <th className={listTableSelectHeadClass}>
                      <ListHeaderCheckbox
                        checked={groupSelection.allSelected}
                        indeterminate={groupSelection.someSelected}
                        disabled={groups.length === 0}
                        onCheckedChange={() => groupSelection.toggleAll()}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">名称</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">编码</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">维度类型</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupsQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={groupTableColSpan} className="px-4 py-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {groups.length === 0 && !groupsQuery.isLoading ? (
                  <tr>
                    <td colSpan={groupTableColSpan} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      暂无分组
                    </td>
                  </tr>
                ) : null}
                {groups.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 dark:border-gray-800">
                    {groupBatch.batchMode ? (
                      <td className={listTableSelectCellClass}>
                        <ListRowCheckbox
                          checked={groupSelection.isSelected(g.id)}
                          onCheckedChange={() => groupSelection.toggle(g.id)}
                          ariaLabel={`选择分组 ${g.name}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{g.name}</td>
                    <td className="px-4 py-3 font-mono text-theme-xs">{g.code}</td>
                    <td className="px-4 py-3">
                      {dimNameById[g.dimension_type_id] ?? (
                        <span className="font-mono text-theme-xs">
                          {g.dimension_type_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openValues(g)}
                        >
                          成员值
                        </Button>
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="编辑分组"
                          onClick={() => {
                            setEditGroup(g);
                            setEditName(g.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="删除分组"
                          onClick={() => setDeleteGroup(g)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="bindings" className="mt-6">
          <RlsRoleBindingPanel groups={groups} groupsLoading={groupsQuery.isLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={dimOpen} onOpenChange={setDimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建维度类型</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dim-code">编码</Label>
              <Input id="dim-code" value={dimCode} onChange={(e) => setDimCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dim-name">名称</Label>
              <Input id="dim-name" value={dimName} onChange={(e) => setDimName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDimOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!dimCode.trim() || !dimName.trim() || createDim.isPending}
              onClick={() =>
                createDim.mutate({
                  code: dimCode.trim(),
                  name: dimName.trim(),
                  value_type: "string",
                })
              }
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建维度分组</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>维度类型</Label>
              <Select value={groupDimId} onValueChange={setGroupDimId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择维度类型" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grp-code">编码</Label>
              <Input id="grp-code" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grp-name">名称</Label>
              <Input id="grp-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGroupOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!groupDimId || !groupCode.trim() || !groupName.trim() || createGroup.isPending}
              onClick={() =>
                createGroup.mutate({
                  dimension_type_id: groupDimId,
                  code: groupCode.trim(),
                  name: groupName.trim(),
                })
              }
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editGroup)}
        onOpenChange={(open) => {
          if (!open) setEditGroup(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分组</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-grp-name">名称</Label>
            <Input
              id="edit-grp-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditGroup(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!editGroup || !editName.trim() || updateGroup.isPending}
              onClick={() =>
                editGroup && updateGroup.mutate({ id: editGroup.id, name: editName.trim() })
              }
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(valuesGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setValuesGroup(null);
            setValuesText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分组成员值 — {valuesGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="grp-values">每行一个值（保存为全量替换）</Label>
            {valuesQuery.isLoading ? <Skeleton className="h-24 w-full" /> : null}
            <Textarea
              id="grp-values"
              rows={8}
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
              placeholder={"华东\n华北"}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValuesGroup(null);
                setValuesText("");
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!valuesGroup || replaceValues.isPending}
              onClick={() => {
                if (!valuesGroup) return;
                const values = valuesText
                  .split(/\r?\n/)
                  .map((v) => v.trim())
                  .filter(Boolean);
                if (values.length === 0) {
                  toast.error("至少填写一个成员值");
                  return;
                }
                replaceValues.mutate({ id: valuesGroup.id, values });
              }}
            >
              保存成员值
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteGroup)}
        onOpenChange={(open) => {
          if (!open) setDeleteGroup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除维度分组？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteGroup?.name}」及其成员值；若仍被角色绑定可能失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="primary"
                disabled={removeGroup.isPending}
                onClick={() => deleteGroup && removeGroup.mutate(deleteGroup.id)}
              >
                删除
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={groupSelection.selectedCount}
        title="批量删除维度分组"
        description="将删除选中的维度分组及其成员值；若仍被角色绑定可能部分失败。"
        pending={batchDeleting}
        onConfirm={() => void handleBatchDeleteGroups()}
      />
    </AdminPageShell>
  );
}

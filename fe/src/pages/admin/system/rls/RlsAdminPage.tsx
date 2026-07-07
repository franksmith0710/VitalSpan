import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type DimensionTypeOut = {
  id: string;
  code: string;
  name: string;
  value_type: string;
  org_dimension: boolean;
  description: string | null;
};

type DimensionGroupOut = {
  id: string;
  dimension_type_id: string;
  code: string;
  name: string;
  parent_id: string | null;
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
    enabled: tab === "groups",
  });

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

  const dimensions = dimensionsQuery.data?.items ?? [];
  const groups = groupsQuery.data?.items ?? [];

  return (
    <AdminPageShell
      title="行级权限"
      description="配置 RLS 维度类型与分组，并在角色管理中绑定生效维度。"
    >
      {dimensionsQuery.isError ? (
        <ErrorBanner
          message={mapApiError(dimensionsQuery.error)}
          onRetry={() => void dimensionsQuery.refetch()}
        />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dimensions">维度类型</TabsTrigger>
          <TabsTrigger value="groups">维度分组</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="primary" size="sm" onClick={() => setDimOpen(true)}>
              <Plus className="size-4" aria-hidden />
              新建维度
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
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
            <Button type="button" variant="primary" size="sm" onClick={() => setGroupOpen(true)}>
              <Plus className="size-4" aria-hidden />
              新建分组
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-[640px] w-full text-left text-theme-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">名称</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">编码</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">维度类型 ID</th>
                </tr>
              </thead>
              <tbody>
                {groupsQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="px-4 py-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {groups.length === 0 && !groupsQuery.isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      暂无分组
                    </td>
                  </tr>
                ) : null}
                {groups.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{g.name}</td>
                    <td className="px-4 py-3 font-mono text-theme-xs">{g.code}</td>
                    <td className="px-4 py-3 font-mono text-theme-xs">{g.dimension_type_id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </AdminPageShell>
  );
}

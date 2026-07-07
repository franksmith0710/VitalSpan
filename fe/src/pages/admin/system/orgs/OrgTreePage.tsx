import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type OrgOut = {
  id: string;
  parent_id: string | null;
  name: string;
  path: string;
  level: number;
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

function OrgRows({ items, parentId, depth }: { items: OrgOut[]; parentId: string | null; depth: number }) {
  const children = items.filter((o) => o.parent_id === parentId);
  if (children.length === 0) return null;
  return (
    <ul className={cn(depth > 0 && "ml-4 border-l border-gray-200 pl-3 dark:border-gray-800")}>
      {children.map((org) => (
        <li key={org.id} className="py-1">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
            <Building2 className="size-4 shrink-0 text-gray-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {org.name}
              </p>
              <p className="truncate font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                {org.path}
              </p>
            </div>
            <span className="text-theme-xs text-gray-400">L{org.level}</span>
          </div>
          <OrgRows items={items} parentId={org.id} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export function OrgTreePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("__root__");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.orgs.all,
    queryFn: () => apiFetch<{ items: OrgOut[] }>("/api/v1/orgs"),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; parent_id?: string | null }) =>
      apiFetch<OrgOut>("/api/v1/orgs", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("组织节点已创建");
      setOpen(false);
      setName("");
      setParentId("__root__");
      await qc.invalidateQueries({ queryKey: queryKeys.orgs.all });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="组织架构"
      description="维护组织树节点，用于用户归属与行级权限维度。"
      actions={
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          新建节点
        </Button>
      }
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            暂无组织节点，点击「新建节点」开始配置。
          </p>
        ) : (
          <OrgRows items={items} parentId={null} depth={0} />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建组织节点</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">名称</Label>
              <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>上级节点</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">（根节点）</SelectItem>
                  {items.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  parent_id: parentId === "__root__" ? null : parentId,
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

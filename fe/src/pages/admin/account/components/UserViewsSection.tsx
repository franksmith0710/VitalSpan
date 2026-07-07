import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type ViewRow = {
  id: string;
  name: string;
  dashboardId: string;
  layout?: Record<string, unknown>;
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

export function UserViewsSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("默认");
  const [dashboardId, setDashboardId] = useState("");

  const listQuery = useQuery({
    queryKey: ["users", "me", "views"],
    queryFn: () => apiFetch<{ items: ViewRow[] }>("/api/v1/users/me/views"),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["users", "me", "views"] });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/users/me/views", {
        method: "POST",
        body: JSON.stringify({ name, dashboardId, layout: {} }),
      }),
    onSuccess: () => {
      toast.success("个人视图已创建");
      setOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (row: ViewRow) =>
      apiFetch(`/api/v1/users/me/views/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: row.name,
          dashboardId: row.dashboardId,
          layout: row.layout ?? {},
        }),
      }),
    onSuccess: () => {
      toast.success("已更新");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/users/me/views/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const setDefault = async (target: ViewRow) => {
    const items = listQuery.data?.items ?? [];
    for (const row of items) {
      if (row.id === target.id) {
        await updateMutation.mutateAsync({ ...row, name: "默认" });
      } else if (row.name === "默认") {
        await updateMutation.mutateAsync({
          ...row,
          name: `备份-${row.id.slice(0, 6)}`,
        });
      }
    }
  };

  const items = (listQuery.data?.items ?? []).slice(0, 20);

  if (listQuery.isError) {
    return (
      <ErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <LayoutDashboard className="size-4" aria-hidden />
          个人默认视图
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="primary" size="sm">
              新建视图
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建个人视图覆盖</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="view-name">名称</Label>
                <Input id="view-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="view-dash">Dashboard ID</Label>
                <Input
                  id="view-dash"
                  value={dashboardId}
                  onChange={(e) => setDashboardId(e.target.value)}
                  placeholder="UUID"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="primary"
                disabled={!dashboardId.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "保存中…" : "保存个人视图"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {listQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-theme-sm text-gray-600 dark:text-gray-400">
            尚未配置个人默认视图，将使用角色默认
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Dashboard ID</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="font-mono text-theme-xs">{row.dashboardId}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={row.name === "默认" || updateMutation.isPending}
                        onClick={() => void setDefault(row)}
                      >
                        设为默认
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm">
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>删除个人视图？</AlertDialogTitle>
                            <AlertDialogDescription>
                              删除后将回落到角色默认 Dashboard。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(row.id)}
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
} from "@/components/layout/list-page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { mapUserError } from "./userErrors";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { useListPagination } from "@/lib/list-pagination";

type UserOut = { id: string; username: string };
type RoleOut = { id: string; code: string; name: string; isActive?: boolean };

function UserRoleBadges({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: queryKeys.users.roles(userId),
    queryFn: () =>
      apiFetch<{ items: RoleOut[] }>(`/api/v1/users/${userId}/roles`).then((r) => r.items),
  });
  if (!data?.length) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {data.map((r) => (
        <Badge key={r.id} variant="light" color="primary" size="sm">
          {r.name}
        </Badge>
      ))}
    </div>
  );
}

export function UserListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [sheetUser, setSheetUser] = useState<UserOut | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const pagination = useListPagination(undefined, [debouncedQ]);

  const listParams = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset: pagination.offset,
      ...(debouncedQ ? { q: debouncedQ } : {}),
    }),
    [debouncedQ, pagination.pageSize, pagination.offset],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.list(listParams),
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(pagination.pageSize),
        offset: String(pagination.offset),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      return apiFetch<{ items: UserOut[]; total: number }>(`/api/v1/users?${params}`);
    },
  });

  const total = data?.total ?? 0;

  const { data: allRoles } = useQuery({
    queryKey: queryKeys.roles.list({ limit: 500, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: RoleOut[] }>("/api/v1/roles?limit=500&offset=0").then((r) => r.items),
    enabled: Boolean(sheetUser),
  });

  const { data: boundRoles, isLoading: rolesLoading } = useQuery({
    queryKey: sheetUser ? queryKeys.users.roles(sheetUser.id) : ["noop"],
    queryFn: () =>
      apiFetch<{ items: RoleOut[] }>(`/api/v1/users/${sheetUser!.id}/roles`).then((r) => r.items),
    enabled: Boolean(sheetUser),
  });

  useEffect(() => {
    if (boundRoles) setSelectedRoleIds(boundRoles.map((r) => r.id));
  }, [boundRoles]);

  const openSheet = (user: UserOut) => {
    setSheetUser(user);
    setActionError(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const username = newUsername.trim();
      if (!username) throw new Error("请输入用户名");
      await apiFetch("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
    },
    onSuccess: async () => {
      toast.success("用户已创建");
      setCreateOpen(false);
      setNewUsername("");
      setCreateError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => setCreateError(mapUserError(err)),
  });

  const saveRolesMutation = useMutation({
    mutationFn: async () => {
      if (!sheetUser) return;
      await apiFetch(`/api/v1/users/${sheetUser.id}/roles`, {
        method: "PUT",
        body: JSON.stringify({ role_ids: selectedRoleIds }),
      });
    },
    onSuccess: async () => {
      toast.success("角色已更新");
      setSheetUser(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => setActionError(mapUserError(err)),
  });

  const toggleRole = (roleId: string, checked: boolean) => {
    setSelectedRoleIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId),
    );
  };

  return (
    <AdminPageShell
      layout="list"
      title="用户管理"
      description="查看用户并分配角色。"
      actions={
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          创建用户
        </Button>
      }
    >
      <ListPageSection>
        <ListPageToolbar
          filters={
            <Input
              className="max-w-md"
              placeholder="搜索用户名…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索用户"
            />
          }
        />

        {isError ? (
          <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
            <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
          </div>
        ) : null}
        {actionError ? (
          <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
            <PageErrorBanner message={actionError} onRetry={() => setActionError(null)} />
          </div>
        ) : null}

        <ListPageTableFrame>
          <div className="overflow-x-only">
            <table className="min-w-[640px] w-full text-left text-theme-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">用户名</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    已绑定角色
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-3" colSpan={3}>
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {!isLoading && data?.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      colSpan={3}
                    >
                      暂无用户
                    </td>
                  </tr>
                ) : null}
                {!isLoading
                  ? data?.items.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                          {row.username}
                        </td>
                        <td className="px-4 py-3">
                          <UserRoleBadges userId={row.id} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openSheet(row)}
                          >
                            管理角色
                          </Button>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </ListPageTableFrame>

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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
            <DialogTitle>创建用户</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5">
            <div className="grid gap-2">
            <Label htmlFor="new-username">用户名</Label>
            <Input
              id="new-username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            {createError ? (
              <p className="text-theme-xs text-error-600">{createError}</p>
            ) : null}
            </div>
          </div>
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(sheetUser)} onOpenChange={(o) => !o && setSheetUser(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>角色绑定 — {sheetUser?.username}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[min(60vh,400px)] pr-4">
            <div className="grid gap-3" aria-label="选择角色">
              {rolesLoading ? <Skeleton className="h-8 w-full" /> : null}
              {allRoles?.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
                >
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={(c) => toggleRole(role.id, c === true)}
                    aria-label={role.name}
                  />
                  <span className="text-theme-sm">{role.name}</span>
                  <span className="ml-auto font-mono text-theme-xs text-gray-500">{role.code}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <SheetFooter className="mt-4">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={saveRolesMutation.isPending}
              onClick={() => saveRolesMutation.mutate()}
            >
              {saveRolesMutation.isPending ? "保存中…" : "保存角色绑定"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}

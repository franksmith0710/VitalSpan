import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
} from "@/components/layout/list-page-kit";
import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { useListPagination } from "@/lib/list-pagination";
import { CreateUserDialog } from "./CreateUserDialog";
import { UserManageSheet } from "./UserManageSheet";
import { isUserLocked } from "./userAccountStatus";

type UserOut = {
  id: string;
  username: string;
  isActive?: boolean;
  lockedUntil?: string | null;
};
type RoleOut = { id: string; code: string; name: string };

function UserStatusBadge({ isActive, lockedUntil }: { isActive?: boolean; lockedUntil?: string | null }) {
  if (isUserLocked(lockedUntil)) {
    return (
      <Badge variant="light" color="warning" size="sm">
        已锁定
      </Badge>
    );
  }
  if (isActive === false) {
    return (
      <Badge variant="light" color="error" size="sm">
        已停用
      </Badge>
    );
  }
  return (
    <Badge variant="light" color="success" size="sm">
      正常
    </Badge>
  );
}

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
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sheetUser, setSheetUser] = useState<UserOut | null>(null);
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

  return (
    <AdminPageShell
      layout="list"
      title="用户管理"
      description="创建用户、分配角色与组织归属，并可重置登录密码。"
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
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
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
                        <td className="px-4 py-3" colSpan={4}>
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {!isLoading && data?.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      colSpan={4}
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
                          <UserStatusBadge isActive={row.isActive} lockedUntil={row.lockedUntil} />
                        </td>
                        <td className="px-4 py-3">
                          <UserRoleBadges userId={row.id} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`管理 ${row.username}`}
                            onClick={() => {
                              setSheetUser(row);
                              setActionError(null);
                            }}
                          >
                            <Settings2 className="size-4" />
                          </IconButton>
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

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserManageSheet
        user={sheetUser}
        onOpenChange={(open) => !open && setSheetUser(null)}
        onActionError={setActionError}
        onUserChange={setSheetUser}
      />
    </AdminPageShell>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { mapUserError } from "./userErrors";
import { UserAccountStatusPanel } from "./UserAccountStatusPanel";
import { UserOrgBindingPanel } from "./UserOrgBindingPanel";
import { UserResetPasswordPanel } from "./UserResetPasswordPanel";
import type { UserAccountFields } from "./userAccountStatus";

type UserOut = { id: string; username: string } & UserAccountFields;
type RoleOut = { id: string; code: string; name: string; isActive?: boolean };

type UserManageSheetProps = {
  user: UserOut | null;
  onOpenChange: (open: boolean) => void;
  onActionError: (message: string | null) => void;
  onUserChange?: (user: UserOut) => void;
};

export function UserManageSheet({
  user,
  onOpenChange,
  onActionError,
  onUserChange,
}: UserManageSheetProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"roles" | "org">("roles");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [accountStatus, setAccountStatus] = useState<Required<UserAccountFields>>({
    isActive: true,
    lockedUntil: null,
  });

  const { data: rolesCatalog, isLoading: rolesCatalogLoading } = useQuery({
    queryKey: queryKeys.roles.list({ limit: 500, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: RoleOut[]; total: number }>("/api/v1/roles?limit=500&offset=0"),
    enabled: Boolean(user),
  });
  const allRoles = rolesCatalog?.items ?? [];

  const { data: boundRoles, isLoading: rolesLoading } = useQuery({
    queryKey: user ? queryKeys.users.roles(user.id) : ["noop"],
    queryFn: () =>
      apiFetch<{ items: RoleOut[] }>(`/api/v1/users/${user!.id}/roles`).then((r) => r.items),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (boundRoles) setSelectedRoleIds(boundRoles.map((r) => r.id));
  }, [boundRoles]);

  useEffect(() => {
    if (!user) setTab("roles");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setAccountStatus({
      isActive: user.isActive ?? true,
      lockedUntil: user.lockedUntil ?? null,
    });
  }, [user]);

  const saveRolesMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await apiFetch(`/api/v1/users/${user.id}/roles`, {
        method: "PUT",
        body: JSON.stringify({ role_ids: selectedRoleIds }),
      });
    },
    onSuccess: async () => {
      toast.success("角色已更新");
      onActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => onActionError(mapUserError(err)),
  });

  const toggleRole = (roleId: string, checked: boolean) => {
    setSelectedRoleIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId),
    );
  };

  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>管理用户 — {user?.username}</SheetTitle>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "roles" | "org")}
          className="mt-4 flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="roles" className="flex-1">
              角色
            </TabsTrigger>
            <TabsTrigger value="org" className="flex-1">
              组织与安全
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-4 min-h-0 flex-1">
            <ScrollArea className="h-[min(50vh,360px)] pr-4">
              <div className="grid gap-3" aria-label="选择角色">
                {rolesLoading || rolesCatalogLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : null}
                {allRoles.map((role) => (
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
                    <span className="ml-auto font-mono text-theme-xs text-gray-500">
                      {role.code}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-4 px-0">
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
          </TabsContent>

          <TabsContent value="org" className="mt-4 space-y-6">
            {user ? (
              <>
                <UserAccountStatusPanel
                  userId={user.id}
                  username={user.username}
                  isActive={accountStatus.isActive}
                  lockedUntil={accountStatus.lockedUntil}
                  onStatusChange={(status) => {
                    setAccountStatus({
                      isActive: status.isActive ?? true,
                      lockedUntil: status.lockedUntil ?? null,
                    });
                    onUserChange?.({
                      ...user,
                      isActive: status.isActive,
                      lockedUntil: status.lockedUntil,
                    });
                  }}
                  onActionError={onActionError}
                />
                <UserOrgBindingPanel userId={user.id} onActionError={onActionError} />
                <UserResetPasswordPanel
                  userId={user.id}
                  username={user.username}
                  onActionError={onActionError}
                />
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

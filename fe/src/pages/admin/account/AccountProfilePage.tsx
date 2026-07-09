import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { MeProfile } from "./account-types";
import { AccountInfoCard } from "./components/AccountInfoCard";
import { AccountProfileHero } from "./components/AccountProfileHero";
import { AccountSecurityLinks } from "./components/AccountSecurityLinks";
import { ProfileEditDialog } from "./components/ProfileEditDialog";

export function AccountProfilePage() {
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<MeProfile>("/api/v1/me"),
  });

  return (
    <AdminPageShell
      title="用户资料"
      description="查看与管理您的账户信息。"
    >
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-theme-sm text-error-700 dark:text-error-400">无法加载用户资料</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <AccountProfileHero profile={data} onEdit={() => setEditOpen(true)} />
          <AccountInfoCard profile={data} />
          <AccountSecurityLinks email={data.email} onEditEmail={() => setEditOpen(true)} />
          <ProfileEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            profile={data}
          />
        </div>
      )}
    </AdminPageShell>
  );
}

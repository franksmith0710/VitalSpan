import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { MeProfile } from "./account-types";
import { RoleDefaultViewCard } from "./components/RoleDefaultViewCard";
import { ThemePreferencesSection } from "./components/ThemePreferencesSection";
import { UserViewsSection } from "./components/UserViewsSection";

export function AccountPreferencesPage() {
  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<MeProfile>("/api/v1/me"),
  });

  return (
    <AdminPageShell
      title="偏好设置"
      description="配置界面主题、登录后的默认看板与个人视图。"
    >
      <div className="grid w-full gap-6">
        <ThemePreferencesSection />
        {meQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : meQuery.data ? (
          <RoleDefaultViewCard roles={meQuery.data.roles} />
        ) : null}
        <UserViewsSection />
      </div>
    </AdminPageShell>
  );
}

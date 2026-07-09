import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { UserViewsSection } from "./components/UserViewsSection";

export function AccountPreferencesPage() {
  return (
    <AdminPageShell
      title="偏好设置"
      description="配置登录后的默认看板与个人视图。"
    >
      <UserViewsSection />
    </AdminPageShell>
  );
}

import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { UserViewsSection } from "./components/UserViewsSection";

export function AccountSettingsPage() {
  return (
    <AdminPageShell
      title="账号设置"
      description="管理个人默认 Dashboard 覆盖与安全偏好。"
    >
      <UserViewsSection />
    </AdminPageShell>
  );
}

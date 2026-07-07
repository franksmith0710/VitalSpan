import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { UserViewsSection } from "@/pages/admin/account/components/UserViewsSection";

export function MyViewsPage() {
  return (
    <AdminPageShell
      title="我的视图"
      description="管理个人默认 Dashboard 覆盖与视图偏好（VIEW-003 / FR-VIEW-4）。"
    >
      <UserViewsSection />
    </AdminPageShell>
  );
}

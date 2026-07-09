import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { ChangePasswordSection } from "./components/ChangePasswordSection";

export function AccountSecurityPage() {
  return (
    <AdminPageShell
      title="安全设置"
      description="管理登录密码与账户安全偏好。"
    >
      <ChangePasswordSection />
    </AdminPageShell>
  );
}

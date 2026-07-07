import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { UserViewsSection } from "./components/UserViewsSection";

export function AccountSettingsPage() {
  return (
    <AdminPageShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>账号设置</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title="账号设置"
      description="管理个人默认 Dashboard 覆盖与安全偏好。"
    >
      <UserViewsSection />
    </AdminPageShell>
  );
}

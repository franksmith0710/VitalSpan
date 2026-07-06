import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AdminPageShell } from "@/components/layout/admin-page-shell";

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
      description="密码与安全偏好将在登录系统联调后开放。"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        登录与凭证管理尚未接入，当前为壳层占位页。
      </div>
    </AdminPageShell>
  );
}

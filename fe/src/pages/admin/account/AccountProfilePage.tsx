import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { getSessionUser } from "@/lib/session";

export function AccountProfilePage() {
  const user = getSessionUser();

  return (
    <AdminPageShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>个人资料</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title="个人资料"
      description="查看与维护当前登录账号的基本信息。"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">显示名称</dt>
            <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {user.name}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">邮箱</dt>
            <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {user.email}
            </dd>
          </div>
        </dl>
      </div>
    </AdminPageShell>
  );
}

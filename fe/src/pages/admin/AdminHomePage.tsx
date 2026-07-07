import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { Database, LayoutDashboard, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { resolveDefaultDashboardPath } from "@/lib/defaultViewResolve";
import { canManagePlatform, sessionUserFromAuth } from "@/lib/session";
import { cn } from "@/lib/utils";

const M1_METRICS = [
  { label: "数据源", value: "—", hint: "M2 开放" },
  { label: "Dashboard", value: "—", hint: "M5 开放" },
  { label: "图表组件", value: "—", hint: "M6 开放" },
  { label: "活跃用户", value: "—", hint: "M3 开放" },
] as const;

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
      <strong className="mt-2 block text-title-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">
        {value}
      </strong>
      <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
        {hint}
      </span>
    </div>
  );
}

export function AdminHomePage() {
  const { user, isLoading } = useAuth();
  const [redirect, setRedirect] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading || !user) return;
    const session = sessionUserFromAuth(user.username, user.roles);
    if (canManagePlatform(session)) {
      setRedirect(null);
      return;
    }
    void resolveDefaultDashboardPath(user.roles).then((path) => {
      setRedirect(path ?? "/admin/dashboards");
    });
  }, [user, isLoading]);

  if (isLoading || redirect === undefined) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <AdminPageShell
      title="欢迎使用 VitalSpan"
      description="M1 管理端壳层已就绪。数据源与权限配置将在后续里程碑开放。"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {M1_METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" elevation={1}>
          <CardHeader>
            <div>
              <CardTitle>壳层预览</CardTitle>
              <CardDescription>组件与设计 Token 冒烟区，暂无 API 联调。</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="demo-input">示例输入</Label>
                <Input id="demo-input" placeholder="占位，无 API 联调" readOnly />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="primary">
                  主操作示例
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card elevation={1}>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>后续里程碑将在此接入真实导航。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { to: "/admin/datasources", icon: Database, label: "数据源", disabled: true },
              { to: "/admin/dashboards", icon: LayoutDashboard, label: "Dashboard", disabled: false },
              { to: "/admin/system/users", icon: Users, label: "用户与角色", disabled: false },
              { to: "/admin", icon: Shield, label: "系统设置", disabled: true },
            ].map((item) => (
              <QuickLink key={item.label} {...item} />
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  disabled,
}: {
  to: string;
  icon: typeof Database;
  label: string;
  disabled?: boolean;
}) {
  const className = cn(
    "flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-theme-sm font-medium transition-colors dark:border-gray-800",
    disabled
      ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
      : "text-gray-700 hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400",
  );

  if (disabled) {
    return (
      <div className={className} aria-disabled="true">
        <Icon className="size-5 shrink-0" aria-hidden />
        <span>{label}</span>
        <span className="ml-auto text-theme-xs text-gray-400">即将开放</span>
      </div>
    );
  }

  return (
    <Link to={to} className={className}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

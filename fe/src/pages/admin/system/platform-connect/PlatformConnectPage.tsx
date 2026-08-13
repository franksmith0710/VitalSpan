import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeaderIcon,
  AdminPageShell,
} from "@/components/layout/admin-page-shell";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type EmailConfig = {
  configured: boolean;
  source: "db" | "env" | "none";
  host?: string | null;
  port?: number | null;
  from?: string | null;
  username?: string | null;
  hasPassword: boolean;
  probeStatus?: string | null;
  probeError?: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  db: "管理面已保存",
  env: "服务器环境变量回落（开发用）",
  none: "未配置",
};

export function PlatformConnectPage() {
  const qc = useQueryClient();
  const configQuery = useQuery({
    queryKey: queryKeys.platformConnect.email,
    queryFn: () => apiFetch<EmailConfig>("/api/v1/platform/delivery/email"),
  });
  const [host, setHost] = useState("smtp.qq.com");
  const [port, setPort] = useState("587");
  const [from, setFrom] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const data = configQuery.data;
    if (!data) return;
    if (data.host) setHost(data.host);
    if (data.port) setPort(String(data.port));
    if (data.from) setFrom(data.from);
    if (data.username) setUsername(data.username);
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<EmailConfig>("/api/v1/platform/delivery/email", {
        method: "PUT",
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port),
          from: from.trim(),
          username: username.trim() || null,
          password: password.trim() || null,
        }),
      }),
    onSuccess: async (data) => {
      toast.success("邮件 SMTP 已保存并通过探测");
      setPassword("");
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.email });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
      void configQuery.refetch();
      if (!data.configured) {
        toast.warning("保存成功但当前仍不可用，请检查探测结果");
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiFetch<EmailConfig>("/api/v1/platform/delivery/email", { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("邮件 SMTP 配置已清空");
      setPassword("");
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.email });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const data = configQuery.data;
  const pending = saveMutation.isPending || clearMutation.isPending;

  return (
    <AdminPageShell
      title="平台对接"
      description="配置定时报告等系统通知的发信通道。保存前会自动探测 SMTP 连通性。"
      headerIcon={
        <AdminPageHeaderIcon>
          <Link2 className="size-5" aria-hidden />
        </AdminPageHeaderIcon>
      }
    >
      {configQuery.isError ? (
        <PageErrorBanner message={mapApiError(configQuery.error)} onRetry={() => void configQuery.refetch()} />
      ) : null}
      {configQuery.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : null}
      {data ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-brand-500" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">邮件 SMTP</h2>
                <p className="text-theme-xs text-gray-500">
                  来源：{SOURCE_LABEL[data.source] ?? data.source}
                  {data.configured ? " · 已配置" : " · 未就绪"}
                </p>
                {data.probeError ? (
                  <p className="text-theme-xs text-amber-700 dark:text-amber-400">{data.probeError}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="smtp-host">SMTP 主机</Label>
                <Input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.qq.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="smtp-port">端口</Label>
                <Input id="smtp-port" value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="smtp-from">发件人邮箱</Label>
                <Input id="smtp-from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="reports@company.com" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="smtp-user">登录用户名（通常与发件人相同）</Label>
                <Input id="smtp-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="smtp-pass">密码 / 授权码</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={data.hasPassword ? "留空则保留已保存的授权码" : "首次保存必填"}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="primary" disabled={pending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "保存并探测…" : "保存并探测"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending || data.source !== "db"}
                onClick={() => clearMutation.mutate()}
              >
                清空配置
              </Button>
            </div>
            <p className="mt-4 text-theme-xs text-gray-500">
              收件人邮箱仍在「用户管理 → 联系方式」维护。清空后即使服务器环境变量仍有旧值，也不会再发信。
            </p>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}

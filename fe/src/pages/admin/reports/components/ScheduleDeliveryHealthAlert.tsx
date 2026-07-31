import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

type DeliveryHealth = {
  status: "reachable" | "unreachable" | "unconfigured";
  host?: string | null;
  port?: number;
  error?: string | null;
};

export function ScheduleDeliveryHealthAlert({ className }: { className?: string }) {
  const healthQuery = useQuery({
    queryKey: ["reports", "schedules", "delivery-health"],
    queryFn: () => apiFetch<DeliveryHealth>("/api/v1/reports/schedules/delivery-health"),
    staleTime: 60_000,
  });

  const health = healthQuery.data;
  if (!health || health.status === "reachable") return null;

  return (
    <Alert variant="warning" className={className}>
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>邮件投递通道不可用</AlertTitle>
      <AlertDescription>
        {health.error ??
          `无法连接 SMTP ${health.host ?? ""}:${health.port ?? ""}。本地开发请启动 MailHog（1025）或配置 RPT_SMTP_* 环境变量。`}
        调度仍可创建，但激活后执行可能投递失败。
      </AlertDescription>
    </Alert>
  );
}

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

type DeliveryHealth = {
  status: "reachable" | "unreachable" | "unconfigured";
  host?: string | null;
  port?: number;
  error?: string | null;
  imOwner?: Record<string, { ready?: boolean; error?: string | null }>;
};

export function ScheduleDeliveryHealthAlert({ className }: { className?: string }) {
  const healthQuery = useQuery({
    queryKey: ["reports", "schedules", "delivery-health"],
    queryFn: () => apiFetch<DeliveryHealth>("/api/v1/reports/schedules/delivery-health"),
    staleTime: 60_000,
  });

  const health = healthQuery.data;
  const imOwnerIssue = health?.imOwner?.feishu;
  const showImOwner = Boolean(imOwnerIssue && imOwnerIssue.ready === false);

  if (!health) return null;
  if (health.status === "reachable" && !showImOwner) return null;

  if (showImOwner && health.status === "reachable") {
    return (
      <Alert variant="warning" className={className}>
        <AlertTriangle className="size-4" aria-hidden />
        <AlertTitle>飞书发信身份未就绪</AlertTitle>
        <AlertDescription>
          {imOwnerIssue?.error ??
            "当前为飞书用户委托模式，调度人将使用您的飞书身份发信。请先在个人中心完成飞书扫码绑定。"}
          调度仍可创建，但激活后 IM 投递可能失败。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="warning" className={className}>
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>邮件投递通道不可用</AlertTitle>
      <AlertDescription>
        {health.error ??
          "邮件服务未配置或不可达。请联系管理员配置邮件服务后再激活定时报告。"}
        调度仍可创建，但激活后执行可能投递失败。
      </AlertDescription>
    </Alert>
  );
}

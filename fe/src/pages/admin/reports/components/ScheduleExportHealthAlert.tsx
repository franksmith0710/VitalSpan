import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

type ExportHealth = {
  status: "available" | "unavailable";
  error?: string | null;
};

export function ScheduleExportHealthAlert({ className }: { className?: string }) {
  const healthQuery = useQuery({
    queryKey: ["reports", "schedules", "export-health"],
    queryFn: () => apiFetch<ExportHealth>("/api/v1/reports/schedules/export-health"),
    staleTime: 60_000,
  });

  const health = healthQuery.data;
  if (!health || health.status === "available") return null;

  return (
    <Alert variant="warning" className={className}>
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>PDF 导出服务不可用</AlertTitle>
      <AlertDescription>
        {health.error ??
          "PDF 导出服务不可用，看板定时报告无法生成可视化 PDF。请联系管理员检查导出服务。"}
        调度仍可创建，但激活后执行将失败。
      </AlertDescription>
    </Alert>
  );
}

export function useScheduleExportHealth() {
  return useQuery({
    queryKey: ["reports", "schedules", "export-health"],
    queryFn: () => apiFetch<ExportHealth>("/api/v1/reports/schedules/export-health"),
    staleTime: 60_000,
  });
}

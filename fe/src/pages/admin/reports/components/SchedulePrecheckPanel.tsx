import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useScheduleExportHealth } from "./ScheduleExportHealthAlert";

type DeliveryHealth = {
  status: "reachable" | "unreachable" | "unconfigured";
  error?: string | null;
};

type PrecheckItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking?: boolean;
};

type SchedulePrecheckPanelProps = {
  sourceLabel: string;
  widgetCount?: number;
  requireVisualExport?: boolean;
  className?: string;
};

function PrecheckRow({ item }: { item: PrecheckItem }) {
  return (
    <li className="flex items-start gap-2 text-theme-xs">
      {item.ok ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-600 dark:text-success-400" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      )}
      <span className="min-w-0">
        <span className="font-medium text-gray-800 dark:text-white/90">{item.label}</span>
        <span className="mt-0.5 block text-gray-500 dark:text-gray-400">{item.detail}</span>
      </span>
    </li>
  );
}

export function useSchedulePrecheckItems(input: {
  sourceLabel: string;
  widgetCount?: number;
  requireVisualExport?: boolean;
}): { items: PrecheckItem[]; blocking: boolean; loading: boolean } {
  const deliveryQuery = useQuery({
    queryKey: ["reports", "schedules", "delivery-health"],
    queryFn: () => apiFetch<DeliveryHealth>("/api/v1/reports/schedules/delivery-health"),
    staleTime: 60_000,
  });
  const exportQuery = useScheduleExportHealth();
  const loading = deliveryQuery.isLoading || exportQuery.isLoading;

  const items: PrecheckItem[] = [];
  const widgetOk = input.widgetCount === undefined || input.widgetCount > 0;
  items.push({
    id: "page",
    label: "目标页面",
    ok: widgetOk,
    detail: widgetOk
      ? `「${input.sourceLabel}」已包含 ${input.widgetCount ?? "若干"} 个可视化组件，可导出 PDF。`
      : `「${input.sourceLabel}」暂无组件，请先在编辑器中添加图表后再创建定时报告。`,
    blocking: !widgetOk,
  });

  const delivery = deliveryQuery.data;
  const deliveryOk = delivery?.status === "reachable";
  items.push({
    id: "delivery",
    label: "邮件投递",
    ok: deliveryOk,
    detail:
      delivery?.error ??
      (deliveryOk
        ? "邮件服务可用，激活后可正常投递。"
        : "邮件服务未配置或不可达；激活后执行可能投递失败，请联系管理员。"),
    blocking: false,
  });

  if (input.requireVisualExport !== false) {
    const exportHealth = exportQuery.data;
    const exportOk = exportHealth?.status === "available";
    items.push({
      id: "export",
      label: "PDF 导出服务",
      ok: exportOk,
      detail:
        exportHealth?.error ??
        (exportOk
          ? "PDF 导出服务就绪，将生成可视化快照。"
          : "PDF 导出服务不可用，无法生成可视化 PDF，请联系管理员。"),
      blocking: !exportOk,
    });
  }

  const blocking = items.some((item) => item.blocking && !item.ok);
  return { items, blocking, loading };
}

export function SchedulePrecheckPanel({
  sourceLabel,
  widgetCount,
  requireVisualExport = true,
  className,
}: SchedulePrecheckPanelProps) {
  const { items, loading } = useSchedulePrecheckItems({
    sourceLabel,
    widgetCount,
    requireVisualExport,
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02]",
        className,
      )}
    >
      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">创建前检查</p>
      <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
        定时报告复用当前看板已保存的查询与筛选，无需在此重复配置数据集。
      </p>
      {loading ? (
        <p className="mt-3 text-theme-xs text-gray-400">检查中…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <PrecheckRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function canCreateDashboardSchedule(input: {
  widgetCount?: number;
  exportStatus?: string;
  loading?: boolean;
}): boolean {
  if (input.loading) return false;
  if (input.widgetCount !== undefined && input.widgetCount <= 0) return false;
  if (input.exportStatus && input.exportStatus !== "available") return false;
  return true;
}

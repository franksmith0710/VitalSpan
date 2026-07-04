import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { isOriginAllowed } from "./EmbedSharePanel";

const DEFAULT_ALLOWED = ["http://localhost:5173", "https://localhost:5173"];

export function EmbedChartPage() {
  const { chartId } = useParams<{ chartId: string }>();
  const [searchParams] = useSearchParams();
  const parentOrigin = window.location.origin;

  const allowedOrigins = useMemo(() => {
    const raw = searchParams.get("allowedOrigins");
    if (raw) return raw.split(",").filter(Boolean);
    return DEFAULT_ALLOWED;
  }, [searchParams]);

  const theme = searchParams.get("theme") === "dark" ? "dark" : "light";
  const authorized = isOriginAllowed(parentOrigin, allowedOrigins);

  const config: ChartViewConfig | null = chartId
    ? {
        chartType: "funnel",
        chartId,
        dataSourceId: "00000000-0000-4000-8000-000000000001",
        mode: "sql",
        sql: "SELECT 1",
        dimensions: [{ field: "stage" }],
        metrics: [{ field: "value" }],
      }
    : null;

  if (!authorized) {
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <p className="text-theme-lg font-medium text-error-700 dark:text-error-400">
          当前来源未授权嵌入
        </p>
        <p className="text-theme-sm text-gray-500">来源：{parentOrigin}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div role="alert" className="p-6 text-theme-sm text-error-600">
        缺少图表 ID
      </div>
    );
  }

  return (
    <div className={`min-h-[240px] p-4 ${theme === "dark" ? "dark" : ""}`}>
      <ChartRenderer config={config} title="嵌入图表" />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
        重试
      </Button>
    </div>
  );
}

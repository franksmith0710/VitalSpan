import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ReportResultTable } from "./ReportResultTable";
import type { ExtensionMetric } from "../useReportTemplates";

type RenderSpec = {
  templateNodeId?: string;
  revision?: number;
  renderVersion?: string;
  templateKind?: string | null;
  metrics?: ExtensionMetric[];
  filters?: Array<{ key: string; operator: string }>;
};

function metricModeLabel(mode?: string) {
  return mode === "dataset" ? "数据集" : "SQL 查询";
}

function metricConfigSummary(metric: ExtensionMetric) {
  if (metric.queryMode === "dataset") {
    return metric.datasetId ? `数据集 ${metric.datasetId.slice(0, 8)}…` : "未绑定数据集";
  }
  if (metric.expression?.trim()) {
    const expr = metric.expression.trim();
    return expr.length > 48 ? `${expr.slice(0, 48)}…` : expr;
  }
  return "未配置 SQL 表达式";
}

export function ReportExtensionPreview({ data }: { data: RenderSpec }) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const metrics = data.metrics ?? [];

  const previewRows = metrics.map((m) => [
    m.label,
    m.key,
    metricModeLabel(m.queryMode),
    metricConfigSummary(m),
  ]);

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-xl border border-gray-200 p-4 text-theme-sm dark:border-gray-800 sm:grid-cols-3">
        <div>
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">修订版本</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">{data.revision ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">渲染版本</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">{data.renderVersion ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">模板格式</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">{data.templateKind ?? "—"}</dd>
        </div>
      </dl>

      {metrics.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          暂无可见指标，请先在扩展配置中添加并保存。
        </p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="border-b border-gray-200 px-4 py-3 text-theme-sm font-medium text-gray-800 dark:border-gray-800 dark:text-white/90">
            指标预览
          </p>
          <div className="p-4">
            <ReportResultTable
              columns={["显示名", "指标键", "查数模式", "配置摘要"]}
              rows={previewRows}
            />
          </div>
        </div>
      )}

      <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
          开发者 JSON
          <ChevronDown className={`size-4 transition-transform ${jsonOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-[320px] overflow-auto rounded-xl border border-gray-200 p-4 text-theme-xs text-gray-700 dark:border-gray-800 dark:text-gray-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

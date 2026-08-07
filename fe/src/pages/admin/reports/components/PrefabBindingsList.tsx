import { Play, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";
import type { PrefabBinding } from "../usePrefabReports";

const ANALYSIS_LABELS: Record<string, string> = {
  lifecycle: "生命周期",
  activity: "活跃度",
  trend: "趋势",
  distribution: "分布",
};

function analysisLabel(type: string): string {
  return ANALYSIS_LABELS[type] ?? type;
}

type Props = {
  bindings: PrefabBinding[];
  runningKey: string | null;
  selectedKey?: string | null;
  onSelect?: (bindingKey: string) => void;
  onRun: (bindingKey: string) => void;
};

export function PrefabBindingsList({
  bindings,
  runningKey,
  selectedKey,
  onSelect,
  onRun,
}: Props) {
  return (
    <ul className="space-y-2">
      {bindings.map((binding) => {
        const isRunning = runningKey === binding.bindingKey;
        const isSelected = selectedKey === binding.bindingKey;
        return (
          <li key={binding.bindingKey}>
            <div
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              className={cn(
                "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                "border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/30",
                "dark:border-gray-800 dark:bg-transparent dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5",
                onSelect
                  ? "cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20"
                  : undefined,
                isSelected
                  ? "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200/80 dark:border-brand-500/40 dark:bg-brand-500/10 dark:ring-brand-500/25"
                  : undefined,
              )}
              onClick={onSelect ? () => onSelect(binding.bindingKey) : undefined}
              onKeyDown={
                onSelect
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(binding.bindingKey);
                      }
                    }
                  : undefined
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TruncateHint
                    title={binding.displayName}
                    as="span"
                    className="text-theme-sm font-medium text-gray-900 dark:text-white"
                  >
                    {binding.displayName}
                  </TruncateHint>
                  <Badge variant="light" color="primary" size="sm">
                    {analysisLabel(binding.analysisType)}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                  {binding.entityTypeCode}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isRunning ? "outline" : "primary"}
                className="shrink-0"
                disabled={isRunning}
                aria-label={`运行报表 ${binding.displayName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRun(binding.bindingKey);
                }}
              >
                <Play className="size-3.5" aria-hidden />
                {isRunning ? "…" : "运行"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PrefabBindingsListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-gray-800">
      <Search className="size-7 text-gray-400 dark:text-gray-500" aria-hidden />
      <p className="mt-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">无匹配报表</p>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">请调整搜索词后重试。</p>
    </div>
  );
}

import { GitBranch, Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { type WorkflowTemplate } from "./workflow-labels";

const METRICS = [
  { key: "templates", label: "流程模板", icon: GitBranch },
  { key: "nodes", label: "流程节点", icon: Layers },
  { key: "roles", label: "参与角色", icon: Users },
] as const;

type WorkflowMetricsProps = {
  templates: WorkflowTemplate[];
  selected: WorkflowTemplate | null;
  className?: string;
};

export function WorkflowMetrics({ templates, selected, className }: WorkflowMetricsProps) {
  const roleCount = new Set(selected?.nodes.map((n) => n.role) ?? []).size;
  const values = {
    templates: templates.length,
    nodes: selected?.nodes.length ?? 0,
    roles: roleCount,
  };

  return (
    <div
      className={cn(
        "grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50/60 dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.02]",
        className,
      )}
      aria-label="流程模板摘要"
    >
      {METRICS.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex items-center gap-3 px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-0.5 text-theme-lg font-semibold tabular-nums text-gray-900 dark:text-white">
              {values[key]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

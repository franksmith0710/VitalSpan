import { GitBranch, Layers, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
};

export function WorkflowMetrics({ templates, selected }: WorkflowMetricsProps) {
  const roleCount = new Set(selected?.nodes.map((n) => n.role) ?? []).size;
  const values = {
    templates: templates.length,
    nodes: selected?.nodes.length ?? 0,
    roles: roleCount,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {METRICS.map(({ key, label, icon: Icon }) => (
        <Card key={key} elevation={1}>
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="mt-0.5 text-title-sm font-semibold text-gray-900 dark:text-white">
                {values[key]}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

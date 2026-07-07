import { ChevronRight, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { nodeLabel, type WorkflowTemplate } from "./workflow-labels";

type WorkflowTemplateListProps = {
  templates: WorkflowTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function WorkflowTemplateList({
  templates,
  selectedId,
  onSelect,
}: WorkflowTemplateListProps) {
  return (
    <div className="space-y-1 p-2">
      {templates.map((tpl) => {
        const selected = tpl.id === selectedId;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
              selected
                ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                selected
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
              )}
            >
              <Workflow className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-theme-sm font-medium">{tpl.name}</p>
              <p className="mt-0.5 font-mono text-theme-xs opacity-70">{tpl.id}</p>
              <p className="mt-1 text-theme-xs opacity-80">{tpl.nodes.length} 个节点</p>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

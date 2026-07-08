import { Workflow } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type WorkflowTemplate } from "./workflow-labels";

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
    <ScrollArea className="h-full max-h-[min(560px,calc(100vh-320px))]">
      <div className="space-y-1 p-2">
        {templates.map((tpl) => {
          const selected = tpl.id === selectedId;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
                selected
                  ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  selected
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
                )}
              >
                <Workflow className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-theme-sm font-medium",
                    selected ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90",
                  )}
                >
                  {tpl.name}
                </p>
                <p className="mt-0.5 truncate font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                  {tpl.id}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-theme-xs text-gray-500 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-400 dark:ring-gray-800">
                {tpl.nodes.length} 节点
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

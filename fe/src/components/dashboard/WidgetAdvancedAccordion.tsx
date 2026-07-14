import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type WidgetAdvancedSection = {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
};

type WidgetAdvancedAccordionProps = {
  sections: WidgetAdvancedSection[];
  className?: string;
};

/** DataEase「高级」Tab：功能设置 / 辅助线 / 条件样式 / 联动 / 跳转 */
export function WidgetAdvancedAccordion({ sections, className }: WidgetAdvancedAccordionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {sections.map((section) => (
        <Collapsible key={section.id} defaultOpen={section.defaultOpen ?? false} className="group">
          <CollapsibleTrigger
            disabled={section.disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-theme-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]",
              section.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <ChevronRight
              className="size-3.5 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-90"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-3 pt-1 text-theme-xs text-gray-600 dark:text-gray-400">
            {section.content}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

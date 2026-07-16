import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * 检查栏内二级折叠：与 {@link DashboardConfigSection} compact 同系，
 * 全宽底部分隔、无圆角外框，避免在 216px 栏内「卡片套卡片」凸起。
 */
export function InspectorNestedSection({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group border-b border-gray-100 dark:border-white/[0.06]", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-1.5 bg-gray-50/80 px-2 py-1.5 text-left text-[11px] font-medium text-gray-600",
          "hover:bg-gray-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
          "dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05]",
        )}
      >
        <ChevronRight
          className="size-3 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-90"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 bg-white px-2 py-1.5 dark:bg-transparent">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

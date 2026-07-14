import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type DashboardConfigSectionProps = {
  title: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  action?: ReactNode;
  placeholder?: string;
  "data-testid"?: string;
};

/** DataEase「仪表板配置」折叠分组：灰底标题条 + 右三角展开 */
export function DashboardConfigSection({
  title,
  children,
  defaultOpen = false,
  disabled = false,
  action,
  placeholder,
  "data-testid": testId,
}: DashboardConfigSectionProps) {
  const headerBarClass = cn(
    "bg-gray-50 dark:bg-white/[0.03]",
    disabled && "opacity-60",
  );

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      disabled={disabled}
      className="group border-b border-gray-100 dark:border-white/[0.06]"
      data-testid={testId}
    >
      <div className={cn("flex w-full items-stretch", headerBarClass)}>
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-700 transition-colors",
            "hover:bg-gray-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
            "dark:text-gray-300 dark:hover:bg-white/[0.05]",
            disabled && "cursor-default hover:bg-transparent dark:hover:bg-transparent",
          )}
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-gray-400 transition-transform",
              !disabled && "group-data-[state=open]:rotate-90",
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{title}</span>
        </CollapsibleTrigger>
        {action ? (
          <div className="flex shrink-0 items-center border-l border-gray-100 px-2 dark:border-white/[0.06]">
            {action}
          </div>
        ) : null}
      </div>
      {!disabled && children ? (
        <CollapsibleContent className="bg-white px-3 py-3 dark:bg-transparent">
          {children}
        </CollapsibleContent>
      ) : null}
      {disabled && placeholder ? (
        <p className="bg-white px-3 py-2.5 text-theme-xs text-gray-400 dark:bg-transparent dark:text-gray-500">
          {placeholder}
        </p>
      ) : null}
    </Collapsible>
  );
}

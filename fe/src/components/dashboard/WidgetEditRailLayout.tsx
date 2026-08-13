import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveWidgetEditRailGridColumns } from "./dashboardEditRailLayout";
import { RailFoldHeader } from "./RailFoldTab";

type WidgetEditRailLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  leftSubtitle?: string;
  rightLabel?: string;
  className?: string;
};

function ExpandedRailPanel({
  label,
  subtitle,
  bordered,
  hideFoldHeader,
  children,
}: {
  label: string;
  subtitle?: string;
  bordered?: boolean;
  hideFoldHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden",
        bordered && "border-l border-gray-200 dark:border-gray-800",
      )}
    >
      {hideFoldHeader ? null : (
        <RailFoldHeader label={label} subtitle={subtitle} />
      )}
      <div className="flex h-0 min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

/** 图表编辑双列：配置 + 数据集；整栏收起由外层 {@link VizComponentInspectorHeader} 负责。 */
export function WidgetEditRailLayout({
  left,
  right,
  leftLabel,
  leftSubtitle,
  rightLabel = "数据集",
  className,
}: WidgetEditRailLayoutProps) {
  return (
    <div
      className={cn("grid h-full min-h-0 w-full max-w-full overflow-hidden", className)}
      style={{ gridTemplateColumns: resolveWidgetEditRailGridColumns(true, true) }}
    >
      <ExpandedRailPanel label={leftLabel} subtitle={leftSubtitle}>
        {left}
      </ExpandedRailPanel>
      <ExpandedRailPanel label={rightLabel} bordered hideFoldHeader>
        {right}
      </ExpandedRailPanel>
    </div>
  );
}

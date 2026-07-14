import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CollapsedRailTab, RailFoldHeader } from "./RailFoldTab";

type WidgetEditRailLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel?: string;
  className?: string;
};

const CONFIG_WIDTH = "w-[min(248px,50%)] min-w-[200px]";
const FIELD_BANK_WIDTH = "min-w-[180px] flex-1";

function ExpandedRailPanel({
  label,
  widthClass,
  bordered,
  onCollapse,
  children,
}: {
  label: string;
  widthClass: string;
  bordered?: boolean;
  onCollapse: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 shrink-0 flex-col",
        widthClass,
        bordered && "border-l border-gray-200 dark:border-gray-800",
      )}
    >
      <RailFoldHeader label={label} onCollapse={onCollapse} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export function WidgetEditRailLayout({
  left,
  right,
  leftLabel,
  rightLabel = "数据集",
  className,
}: WidgetEditRailLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className={cn("flex h-full min-h-0 w-full max-w-full", className)}>
      {leftOpen ? (
        <ExpandedRailPanel
          label={leftLabel}
          widthClass={CONFIG_WIDTH}
          onCollapse={() => setLeftOpen(false)}
        >
          {left}
        </ExpandedRailPanel>
      ) : (
        <CollapsedRailTab label={leftLabel} onExpand={() => setLeftOpen(true)} className="border-l-0" />
      )}
      {rightOpen ? (
        <ExpandedRailPanel
          label={rightLabel}
          widthClass={FIELD_BANK_WIDTH}
          bordered
          onCollapse={() => setRightOpen(false)}
        >
          {right}
        </ExpandedRailPanel>
      ) : (
        <CollapsedRailTab label={rightLabel} onExpand={() => setRightOpen(true)} />
      )}
    </div>
  );
}

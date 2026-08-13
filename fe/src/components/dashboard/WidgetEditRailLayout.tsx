import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS,
  DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS,
} from "./dashboardEditRailLayout";
import { CollapsedRailTab, RailFoldHeader } from "./RailFoldTab";
type WidgetEditRailLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  leftSubtitle?: string;
  rightLabel?: string;
  className?: string;
  /** 双列均收起时通知外层缩窄右栏外壳 */
  onCompactChange?: (compact: boolean) => void;
};

const RAIL_LEFT_WIDTH = DASHBOARD_EDIT_RAIL_LEFT_COLUMN_CLASS;
const RAIL_RIGHT_WIDTH = DASHBOARD_EDIT_RAIL_RIGHT_COLUMN_CLASS;

const WidgetEditRailRightCollapseContext = createContext<(() => void) | undefined>(undefined);

/** 数据集列顶栏「收起」回调（由 `WidgetEditRailLayout` 注入） */
export function useWidgetEditRailRightCollapse() {
  return useContext(WidgetEditRailRightCollapseContext);
}

function ExpandedRailPanel({
  label,
  subtitle,
  widthClass,
  bordered,
  onCollapse,
  children,
  hideFoldHeader,
}: {
  label: string;
  subtitle?: string;
  widthClass: string;
  bordered?: boolean;
  onCollapse: () => void;
  children: ReactNode;
  hideFoldHeader?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col",
        widthClass,
        bordered && "border-l border-gray-200 dark:border-gray-800",
      )}
    >
      {hideFoldHeader ? null : (
        <RailFoldHeader label={label} subtitle={subtitle} onCollapse={onCollapse} />
      )}
      <div className="flex h-0 min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export function WidgetEditRailLayout({
  left,
  right,
  leftLabel,
  leftSubtitle,
  rightLabel = "数据集",
  className,
  onCompactChange,
}: WidgetEditRailLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const compact = !leftOpen && !rightOpen;

  useEffect(() => {
    onCompactChange?.(compact);
  }, [compact, onCompactChange]);

  const hasExpandedColumn = leftOpen || rightOpen;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 shrink-0 overflow-hidden",
        compact ? "ml-auto w-fit max-w-full" : "w-[432px] max-w-full",
        className,
      )}
    >
      {leftOpen ? (
        <ExpandedRailPanel
          label={leftLabel}
          subtitle={leftSubtitle}
          widthClass={RAIL_LEFT_WIDTH}
          onCollapse={() => setLeftOpen(false)}
        >
          {left}
        </ExpandedRailPanel>
      ) : null}
      {rightOpen ? (
        <ExpandedRailPanel
          label={rightLabel}
          widthClass={RAIL_RIGHT_WIDTH}
          bordered
          hideFoldHeader
          onCollapse={() => setRightOpen(false)}
        >
          <WidgetEditRailRightCollapseContext.Provider value={() => setRightOpen(false)}>
            {right}
          </WidgetEditRailRightCollapseContext.Provider>
        </ExpandedRailPanel>
      ) : null}
      {!leftOpen ? (
        <CollapsedRailTab
          label={leftLabel}
          onExpand={() => setLeftOpen(true)}
          className={hasExpandedColumn ? undefined : "border-l-0"}
        />
      ) : null}
      {!rightOpen ? (
        <CollapsedRailTab label={rightLabel} onExpand={() => setRightOpen(true)} />
      ) : null}
    </div>
  );
}

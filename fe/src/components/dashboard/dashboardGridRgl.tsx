/**
 * Dashboard 画布栅格引擎：react-grid-layout
 *
 * 选型说明（对标 DataEase / Apache Superset 看板）：
 * - react-grid-layout：12 列拖拽 + 缩放 + 垂直紧凑，BI 看板事实标准
 * - 未采用 GridStack：迁移成本高，收益与 RGL 重叠
 * - 未采用 @dnd-kit 自研：需重写碰撞/紧凑/持久化
 *
 * @see https://github.com/react-grid-layout/react-grid-layout
 */
import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  ReactGridLayout,
  WidthProvider,
  type Layout,
  type LegacyReactGridLayoutProps,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import { GRID_ROW_HEIGHT } from "./gridLayoutAdapter";
import { GRID_COLS } from "./gridSnapUtils";

export const DASHBOARD_GRID_MARGIN: [number, number] = [12, 12];
export const DASHBOARD_GRID_ROW_HEIGHT = GRID_ROW_HEIGHT;
export const DASHBOARD_GRID_COLS = GRID_COLS;

type GridLayoutWithWidthProps = Omit<LegacyReactGridLayoutProps, "width">;

/** RGL 官方 WidthProvider：容器宽度变化时自动重算列宽（自适应） */
export const DashboardGridLayout = WidthProvider(
  ReactGridLayout,
) as ComponentType<GridLayoutWithWidthProps>;

export type DashboardRglCanvasProps = {
  layout: Layout;
  editable: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onLayoutChange?: (layout: Layout) => void;
  onDragStart?: () => void;
  onDragStop?: (layout: Layout) => void;
  onResizeStart?: () => void;
  onResizeStop?: (layout: Layout) => void;
};

/** 统一 RGL 配置：编辑/预览共用，避免 edit/view 布局漂移 */
export function DashboardRglCanvas({
  layout,
  editable,
  className,
  style,
  children,
  onLayoutChange,
  onDragStart,
  onDragStop,
  onResizeStart,
  onResizeStop,
}: DashboardRglCanvasProps) {
  return (
    <DashboardGridLayout
      className={className}
      style={style}
      layout={layout}
      cols={DASHBOARD_GRID_COLS}
      rowHeight={DASHBOARD_GRID_ROW_HEIGHT}
      margin={DASHBOARD_GRID_MARGIN}
      containerPadding={[0, 0]}
      compactType="vertical"
      preventCollision
      autoSize
      isDraggable={editable}
      isResizable={editable}
      isDroppable={false}
      resizeHandles={editable ? ["se"] : undefined}
      draggableHandle={editable ? ".dashboard-drag-handle" : undefined}
      draggableCancel={editable ? ".dashboard-no-drag" : undefined}
      useCSSTransforms={false}
      onLayoutChange={onLayoutChange}
      onDragStart={editable ? onDragStart : undefined}
      onDragStop={editable ? onDragStop : undefined}
      onResizeStart={editable ? onResizeStart : undefined}
      onResizeStop={editable ? onResizeStop : undefined}
    >
      {children}
    </DashboardGridLayout>
  );
}

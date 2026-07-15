import {
  ChevronRight,
  Copy,
  Eye,
  Maximize2,
  MoreVertical,
  Table2,
  Trash2,
} from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PixelLayoutWidget } from "../layoutUtils";
import {
  resolveShapeActionRailPlacement,
  SHAPE_ACTION_RAIL_SCREEN_GAP,
  SHAPE_ACTION_RAIL_SCREEN_WIDTH,
  type PixelRect,
  type ShapeActionRailPlacement,
} from "./geometry";

export type PixelWidgetActions = {
  onCopy?: (widgetId: string) => void;
  onDelete?: (widgetId: string) => void;
  onEnlarge?: (widgetId: string) => void;
  onViewData?: (widgetId: string) => void;
  onTitleChange?: (widgetId: string, title: string) => void;
};

type PixelShapeActionRailProps = {
  widget: PixelLayoutWidget;
  scale: number;
  viewport: { x: number; width: number };
  otherWidgets?: Array<Pick<PixelRect, "x" | "y" | "width" | "height">>;
  actions: PixelWidgetActions;
};

const RAIL_SHELL_CLASS = cn(
  "flex w-full flex-col overflow-hidden rounded-lg",
  "border border-gray-200 bg-white shadow-theme-md",
  "divide-y divide-gray-100",
  "dark:border-gray-700 dark:bg-gray-900 dark:divide-gray-800",
);

const RAIL_BUTTON_CLASS = cn(
  "size-full min-h-0 rounded-none p-0",
  "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
  "dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100",
  "focus-visible:ring-inset focus-visible:ring-brand-500/25",
  "disabled:pointer-events-none disabled:opacity-35",
);

function railPositionStyle(
  placement: ShapeActionRailPlacement,
  gapPx: number,
): Record<string, string | number> {
  if (placement === "overlay") {
    return { left: 0, top: 0 };
  }
  if (placement === "right") {
    return { left: `calc(100% + ${gapPx}px)` };
  }
  return { right: `calc(100% + ${gapPx}px)` };
}

function RailIconButton({
  label,
  disabled,
  dimmed,
  sizePx,
  iconSizePx,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  dimmed?: boolean;
  sizePx: number;
  iconSizePx: number;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      type="button"
      variant="ghost"
      size="sm"
      className={cn(RAIL_BUTTON_CLASS, dimmed && "opacity-40")}
      style={{ width: sizePx, height: sizePx }}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span style={{ width: iconSizePx, height: iconSizePx }} className="inline-flex shrink-0">
        {children}
      </span>
    </IconButton>
  );
}

export function PixelShapeActionRail({
  widget,
  scale,
  viewport,
  otherWidgets = [],
  actions,
}: PixelShapeActionRailProps) {
  const safeScale = scale > 0 ? scale : 1;
  const placement = resolveShapeActionRailPlacement(widget, viewport, safeScale, otherWidgets);
  const railPx = SHAPE_ACTION_RAIL_SCREEN_WIDTH / safeScale;
  const gapPx = SHAPE_ACTION_RAIL_SCREEN_GAP / safeScale;
  const iconPx = 14 / safeScale;
  const isChart = widget.type === "chart";
  const menuSide = placement === "right" ? "left" : "right";

  const stopPointer = (event: PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      data-testid={`pixel-shape-actions-${widget.id}`}
      data-placement={placement}
      className={cn(
        "absolute z-40 flex touch-none select-none",
        placement === "overlay" ? "z-50" : "top-0",
      )}
      style={{
        width: railPx,
        ...railPositionStyle(placement, gapPx),
      }}
      onPointerDown={stopPointer}
    >
      <div className={RAIL_SHELL_CLASS}>
        <RailIconButton
          label="查看数据"
          dimmed={!isChart}
          disabled={!isChart || !actions.onViewData}
          sizePx={railPx}
          iconSizePx={iconPx}
          onClick={() => actions.onViewData?.(widget.id)}
        >
          <Table2 className="size-full" aria-hidden />
        </RailIconButton>
        <RailIconButton
          label="放大"
          dimmed={!isChart}
          disabled={!isChart || !actions.onEnlarge}
          sizePx={railPx}
          iconSizePx={iconPx}
          onClick={() => actions.onEnlarge?.(widget.id)}
        >
          <Maximize2 className="size-full" aria-hidden />
        </RailIconButton>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <RailIconButton label="更多操作" sizePx={railPx} iconSizePx={iconPx}>
              <MoreVertical className="size-full" aria-hidden />
            </RailIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={menuSide} align="start" sideOffset={6} className="min-w-[10.5rem]">
            <DropdownMenuItem
              disabled={!actions.onCopy}
              onSelect={() => actions.onCopy?.(widget.id)}
            >
              <Copy className="size-3.5" aria-hidden />
              复制
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isChart || !actions.onEnlarge}
              onSelect={() => actions.onEnlarge?.(widget.id)}
            >
              <Maximize2 className="size-3.5" aria-hidden />
              放大
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isChart || !actions.onViewData}
              onSelect={() => actions.onViewData?.(widget.id)}
            >
              <Eye className="size-3.5" aria-hidden />
              查看数据
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled>
                导出为
                <ChevronRight className="ml-auto size-3.5" aria-hidden />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>图片</DropdownMenuItem>
                <DropdownMenuItem disabled>PDF</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem disabled>隐藏</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-error-600 focus:text-error-600 dark:text-error-400"
              disabled={!actions.onDelete}
              onSelect={() => actions.onDelete?.(widget.id)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

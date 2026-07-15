import {
  Copy,
  Eye,
  Maximize2,
  MoreVertical,
  Table2,
  Trash2,
} from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
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
  SHAPE_ACTION_RAIL_ICON_SCREEN_WIDTH,
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
  colorScheme?: ColorScheme;
};

function railShellClass(scheme: ColorScheme): string {
  return cn(
    "flex w-full flex-col overflow-visible rounded-lg shadow-theme-md",
    "border divide-y",
    scheme === "dark"
      ? "border-gray-700 bg-gray-900 divide-gray-800"
      : "border-gray-200 bg-white divide-gray-100",
  );
}

function railButtonClass(scheme: ColorScheme): string {
  return cn(
    "size-full min-h-0 rounded-none p-0",
    "focus-visible:ring-inset focus-visible:ring-brand-500/25",
    "disabled:pointer-events-none disabled:opacity-35",
    scheme === "dark"
      ? "text-gray-400 hover:bg-white/5 hover:text-gray-100"
      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
  );
}

function railTipClass(scheme: ColorScheme): string {
  return cn(
    "dw-rail-tip pointer-events-none absolute top-1/2 z-[80] -translate-y-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-theme-xs font-medium shadow-theme-sm",
    "border opacity-0 transition-opacity duration-150",
    "group-hover/rail-item:opacity-100 group-focus-within/rail-item:opacity-100",
    scheme === "dark"
      ? "border-gray-700 bg-gray-900 text-gray-100"
      : "border-gray-200 bg-white text-gray-700",
  );
}

function menuChromeClass(scheme: ColorScheme): string {
  return cn(
    "z-[90] min-w-[10.5rem]",
    scheme === "dark"
      ? "border-gray-700 bg-gray-900 text-gray-300"
      : "border-gray-200 bg-white text-gray-700",
  );
}

function menuItemClass(scheme: ColorScheme, destructive = false): string | undefined {
  if (destructive) {
    return scheme === "dark"
      ? "text-error-400 focus:bg-error-500/10 focus:text-error-300"
      : "text-error-600 focus:text-error-600";
  }
  return scheme === "dark" ? "text-gray-300 focus:bg-white/5 focus:text-gray-200" : undefined;
}

function menuSubTriggerClass(scheme: ColorScheme): string | undefined {
  return scheme === "dark"
    ? "text-gray-300 focus:bg-white/5 data-[state=open]:bg-white/5"
    : undefined;
}

function menuSeparatorClass(scheme: ColorScheme): string | undefined {
  return scheme === "dark" ? "bg-gray-800" : undefined;
}

function railPositionStyle(
  placement: ShapeActionRailPlacement,
  gapPx: number,
): Record<string, string | number> {
  if (placement === "right") {
    return { left: `calc(100% + ${gapPx}px)` };
  }
  return { right: `calc(100% + ${gapPx}px)` };
}

function railTipPositionClass(placement: ShapeActionRailPlacement): string {
  return placement === "right" ? "left-full ml-1.5" : "right-full mr-1.5";
}

type RailIconButtonProps = {
  label: string;
  dimmed?: boolean;
  sizePx: number;
  iconSizePx: number;
  buttonClassName: string;
  onAction?: () => void;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const RailIconButton = forwardRef<HTMLButtonElement, RailIconButtonProps>(function RailIconButton(
  {
    label,
    disabled,
    dimmed,
    sizePx,
    iconSizePx,
    buttonClassName,
    onAction,
    children,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!onAction || event.defaultPrevented) return;
    event.stopPropagation();
    onAction();
  };

  return (
    <IconButton
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(buttonClassName, dimmed && "opacity-40", className)}
      style={{ width: sizePx, height: sizePx }}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
      onClick={handleClick}
    >
      <span style={{ width: iconSizePx, height: iconSizePx }} className="inline-flex shrink-0">
        {children}
      </span>
    </IconButton>
  );
});

function RailActionItem({
  label,
  tipClassName,
  disabled,
  dimmed,
  sizePx,
  iconSizePx,
  buttonClassName,
  tipToneClass,
  onAction,
  children,
}: {
  label: string;
  tipClassName: string;
  disabled?: boolean;
  dimmed?: boolean;
  sizePx: number;
  iconSizePx: number;
  buttonClassName: string;
  tipToneClass: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="group/rail-item relative overflow-visible">
      <RailIconButton
        label={label}
        disabled={disabled}
        dimmed={dimmed}
        sizePx={sizePx}
        iconSizePx={iconSizePx}
        buttonClassName={buttonClassName}
        onAction={onAction}
      >
        {children}
      </RailIconButton>
      <span className={cn(tipToneClass, tipClassName)} role="tooltip">
        {label}
      </span>
    </div>
  );
}

export function PixelShapeActionRail({
  widget,
  scale,
  viewport,
  otherWidgets = [],
  actions,
  colorScheme = "light",
}: PixelShapeActionRailProps) {
  const safeScale = scale > 0 ? scale : 1;
  const placement = resolveShapeActionRailPlacement(widget, viewport, safeScale, otherWidgets);
  const railPx = SHAPE_ACTION_RAIL_SCREEN_WIDTH / safeScale;
  const gapPx = SHAPE_ACTION_RAIL_SCREEN_GAP / safeScale;
  const iconPx = SHAPE_ACTION_RAIL_ICON_SCREEN_WIDTH / safeScale;
  const isChart = widget.type === "chart";
  const menuSide = placement === "right" ? "left" : "right";
  const tipClassName = railTipPositionClass(placement);
  const shellClass = railShellClass(colorScheme);
  const buttonClass = railButtonClass(colorScheme);
  const tipToneClass = railTipClass(colorScheme);

  const stopPointer = (event: PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      data-testid={`pixel-shape-actions-${widget.id}`}
      data-placement={placement}
      data-dashboard-color-scheme={colorScheme}
      className="dashboard-no-drag pointer-events-auto absolute top-0 z-40 flex touch-none select-none overflow-visible"
      style={{
        width: railPx,
        ...railPositionStyle(placement, gapPx),
      }}
      data-pixel-no-drag
      onPointerDown={stopPointer}
    >
      <div className={shellClass}>
        <RailActionItem
          label="查看数据"
          tipClassName={tipClassName}
          tipToneClass={tipToneClass}
          buttonClassName={buttonClass}
          dimmed={!isChart}
          disabled={!isChart || !actions.onViewData}
          sizePx={railPx}
          iconSizePx={iconPx}
          onAction={() => actions.onViewData?.(widget.id)}
        >
          <Table2 className="size-full" aria-hidden />
        </RailActionItem>
        <RailActionItem
          label="放大"
          tipClassName={tipClassName}
          tipToneClass={tipToneClass}
          buttonClassName={buttonClass}
          dimmed={!isChart}
          disabled={!isChart || !actions.onEnlarge}
          sizePx={railPx}
          iconSizePx={iconPx}
          onAction={() => actions.onEnlarge?.(widget.id)}
        >
          <Maximize2 className="size-full" aria-hidden />
        </RailActionItem>
        <div className="group/rail-item relative overflow-visible">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <RailIconButton
                label="更多操作"
                sizePx={railPx}
                iconSizePx={iconPx}
                buttonClassName={buttonClass}
                data-testid="pixel-shape-action-more"
              >
                <MoreVertical className="size-full" aria-hidden />
              </RailIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={menuSide}
              align="start"
              sideOffset={6}
              className={menuChromeClass(colorScheme)}
              data-dashboard-menu=""
              data-dashboard-color-scheme={colorScheme}
            >
              <DropdownMenuItem
                className={menuItemClass(colorScheme)}
                disabled={!actions.onCopy}
                onSelect={() => actions.onCopy?.(widget.id)}
              >
                <Copy className="size-3.5" aria-hidden />
                复制
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass(colorScheme)}
                disabled={!isChart || !actions.onEnlarge}
                onSelect={() => actions.onEnlarge?.(widget.id)}
              >
                <Maximize2 className="size-3.5" aria-hidden />
                放大
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass(colorScheme)}
                disabled={!isChart || !actions.onViewData}
                onSelect={() => actions.onViewData?.(widget.id)}
              >
                <Eye className="size-3.5" aria-hidden />
                查看数据
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={menuSubTriggerClass(colorScheme)} disabled>
                  导出为
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className={menuChromeClass(colorScheme)}
                  data-dashboard-menu=""
                  data-dashboard-color-scheme={colorScheme}
                >
                  <DropdownMenuItem className={menuItemClass(colorScheme)} disabled>
                    图片
                  </DropdownMenuItem>
                  <DropdownMenuItem className={menuItemClass(colorScheme)} disabled>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className={menuItemClass(colorScheme)} disabled>
                隐藏
              </DropdownMenuItem>
              <DropdownMenuSeparator className={menuSeparatorClass(colorScheme)} />
              <DropdownMenuItem
                className={menuItemClass(colorScheme, true)}
                disabled={!actions.onDelete}
                onSelect={() => actions.onDelete?.(widget.id)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className={cn(tipToneClass, tipClassName)} role="tooltip">
            更多操作
          </span>
        </div>
      </div>
    </div>
  );
}

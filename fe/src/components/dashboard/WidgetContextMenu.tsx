import {
  Copy,
  Eye,
  ChevronsDown,
  ChevronsUp,
  Maximize2,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";

export type DashboardWidgetActions = {
  onCopy?: (widgetId: string) => void;
  onDelete?: (widgetId: string) => void;
  onEnlarge?: (widgetId: string) => void;
  onViewData?: (widgetId: string) => void;
  onTitleChange?: (widgetId: string, title: string) => void;
  onBringToFront?: (widgetId: string) => void;
  onSendToBack?: (widgetId: string) => void;
  showLayerActions?: boolean;
};

/** @deprecated 使用 {@link DashboardWidgetActions} */
export type PixelWidgetActions = DashboardWidgetActions;

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

type WidgetContextMenuContentProps = {
  widget: Pick<LayoutWidget, "id" | "type" | "locked">;
  actions: DashboardWidgetActions;
  colorScheme?: ColorScheme;
};

export function WidgetContextMenuContent({
  widget,
  actions,
  colorScheme = "light",
}: WidgetContextMenuContentProps) {
  const isChart = widget.type === "chart";
  const locked = Boolean(widget.locked);

  return (
    <>
      <ContextMenuItem
        className={menuItemClass(colorScheme)}
        disabled={locked || !actions.onCopy}
        onSelect={() => actions.onCopy?.(widget.id)}
      >
        <Copy className="size-3.5" aria-hidden />
        复制
      </ContextMenuItem>
      <ContextMenuItem
        className={menuItemClass(colorScheme)}
        disabled={!isChart || !actions.onEnlarge}
        onSelect={() => actions.onEnlarge?.(widget.id)}
      >
        <Maximize2 className="size-3.5" aria-hidden />
        放大
      </ContextMenuItem>
      <ContextMenuItem
        className={menuItemClass(colorScheme)}
        disabled={!isChart || !actions.onViewData}
        onSelect={() => actions.onViewData?.(widget.id)}
      >
        <Eye className="size-3.5" aria-hidden />
        查看数据
      </ContextMenuItem>
      {actions.showLayerActions ? (
        <>
          <ContextMenuItem
            className={menuItemClass(colorScheme)}
            disabled={locked || !actions.onBringToFront}
            onSelect={() => actions.onBringToFront?.(widget.id)}
          >
            <ChevronsUp className="size-3.5" aria-hidden />
            置顶
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass(colorScheme)}
            disabled={locked || !actions.onSendToBack}
            onSelect={() => actions.onSendToBack?.(widget.id)}
          >
            <ChevronsDown className="size-3.5" aria-hidden />
            置底
          </ContextMenuItem>
        </>
      ) : null}
      <ContextMenuSub>
        <ContextMenuSubTrigger className={menuSubTriggerClass(colorScheme)} disabled>
          导出为
        </ContextMenuSubTrigger>
        <ContextMenuSubContent
          className={menuChromeClass(colorScheme)}
          data-dashboard-menu=""
          data-dashboard-color-scheme={colorScheme}
        >
          <ContextMenuItem className={menuItemClass(colorScheme)} disabled>
            图片
          </ContextMenuItem>
          <ContextMenuItem className={menuItemClass(colorScheme)} disabled>
            PDF
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem className={menuItemClass(colorScheme)} disabled>
        隐藏
      </ContextMenuItem>
      <ContextMenuSeparator className={menuSeparatorClass(colorScheme)} />
      <ContextMenuItem
        variant="destructive"
        className={menuItemClass(colorScheme, true)}
        disabled={locked || !actions.onDelete}
        onSelect={() => actions.onDelete?.(widget.id)}
      >
        <Trash2 className="size-3.5" aria-hidden />
        删除
      </ContextMenuItem>
    </>
  );
}

type DashboardWidgetContextMenuProps = {
  widget: Pick<LayoutWidget, "id" | "type" | "locked">;
  actions: DashboardWidgetActions;
  colorScheme?: ColorScheme;
  selected?: boolean;
  onSelect?: (widgetId: string, additive: boolean) => void;
  children: ReactNode;
  className?: string;
  /** 测试用：受控展开菜单（Radix ContextMenu 不支持无交互 defaultOpen） */
  open?: boolean;
};

export function DashboardWidgetContextMenu({
  widget,
  actions,
  colorScheme = "light",
  selected,
  onSelect,
  children,
  className,
  open,
}: DashboardWidgetContextMenuProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !selected) {
      onSelect?.(widget.id, false);
    }
  };

  return (
    <ContextMenu
      modal={false}
      onOpenChange={handleOpenChange}
      {...(open !== undefined ? { open } : {})}
    >
      <ContextMenuTrigger asChild className={className}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className={menuChromeClass(colorScheme)}
        data-dashboard-menu=""
        data-dashboard-color-scheme={colorScheme}
        data-testid={`widget-context-menu-${widget.id}`}
      >
        <WidgetContextMenuContent widget={widget} actions={actions} colorScheme={colorScheme} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

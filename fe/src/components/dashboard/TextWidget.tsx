import { useRef, useState } from "react";
import { GripVertical, Trash2, Type } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardWidgetShell } from "./dashboardCanvasMode";
import { RichTextEditor } from "./RichTextEditor";
import { TabNestedDragRail } from "./TabNestedDragRail";
import { WidgetInlineTitle } from "./WidgetInlineTitle";
import { isRichTextEmpty, textConfigToHtml } from "./richTextHtml";
import { ScreenBorderDisplay } from "./screen/ScreenBorderDisplay";
import { ScreenClockDisplay } from "./screen/ScreenClockDisplay";
import { ScreenTitleBarDisplay } from "./screen/ScreenTitleBarDisplay";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";
import {
  isScreenBorderWidget,
  isScreenClockWidget,
  isScreenTitleBarWidget,
  isScreenVisualWidget,
} from "@/lib/screenVisualAssets";

type TextWidgetProps = {
  widget: LayoutWidget & { textConfig: TextWidgetConfig };
  mode: "edit" | "view";
  shell?: DashboardWidgetShell;
  nested?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  onTextConfigChange?: (id: string, config: TextWidgetConfig) => void;
};

export function TextWidget({
  widget,
  mode,
  shell = "grid",
  nested = false,
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
  onTextConfigChange,
}: TextWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const html = textConfigToHtml(widget.textConfig);
  const inShapeShell = shell === "shape";
  const screenClock = isScreenClockWidget(widget);
  const screenBorder = isScreenBorderWidget(widget);
  const screenTitleBar = isScreenTitleBarWidget(widget);
  const screenVisual = isScreenVisualWidget(widget);

  const beginEditing = () => {
    if (mode !== "edit" || screenVisual) return;
    onSelect?.();
    setIsEditing(true);
  };

  const commit = (nextHtml: string) => {
    onTextConfigChange?.(widget.id, {
      content: isRichTextEmpty(nextHtml) ? "" : nextHtml,
      variant: "html",
    });
    setIsEditing(false);
  };

  const cancel = () => {
    setIsEditing(false);
  };

  const showGridChrome = shell === "grid";

  const content = (
    <div
      ref={widgetRef}
      className={cn(
        "flex h-full min-h-0 flex-col",
        showGridChrome && "overflow-hidden rounded-xl border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        showGridChrome && isEditing && "ring-2 ring-brand-500/50 border-brand-400 dark:border-brand-500/60",
        showGridChrome && !isEditing && selected && "dashboard-widget-selected",
        showGridChrome &&
          !isEditing &&
          selected &&
          "border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40",
        showGridChrome && !isEditing && !selected && "border-gray-200 dark:border-gray-800",
        nested && inShapeShell && mode === "edit" && "pl-7",
      )}
    >
      {showGridChrome && mode === "edit" && !isEditing ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.04]">
          <div
            className="dashboard-drag-handle flex shrink-0 cursor-grab items-center active:cursor-grabbing"
            role="group"
            aria-label="拖动以移动组件"
          >
            <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
            <Type className="size-3.5" aria-hidden />
          </span>
          <WidgetInlineTitle
            value={widget.title}
            editable={Boolean(onTitleChange)}
            onChange={onTitleChange ? (next) => onTitleChange(widget.id, next) : undefined}
            ariaLabel="富文本标题"
            testId={`widget-inline-title-${widget.id}`}
          />
          {onDelete ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-no-drag size-7 shrink-0 text-gray-400 hover:text-error-600"
              aria-label="删除组件"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(widget.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      ) : showGridChrome && mode === "view" ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
            <Type className="size-3.5" aria-hidden />
          </span>
          <h4 className="min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {widget.title}
          </h4>
        </div>
      ) : null}

      <div
        data-testid="text-widget-content"
        role={mode === "edit" && !isEditing ? "button" : undefined}
        tabIndex={mode === "edit" && !isEditing ? 0 : undefined}
        onClick={
          mode === "edit" && !isEditing
            ? (event) => {
                event.stopPropagation();
                onSelect?.();
              }
            : undefined
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!screenVisual) beginEditing();
        }}
        className={cn(
          "dashboard-no-drag dashboard-scroll min-h-0 flex-1 overflow-auto",
          mode === "edit" && !isEditing && "cursor-pointer",
          !inShapeShell && mode === "edit" && !isEditing && "hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
      >
        {isEditing ? (
          <RichTextEditor
            anchorRef={widgetRef}
            initialHtml={html}
            inset={inShapeShell ? "none" : "comfortable"}
            onCommit={commit}
            onCancel={cancel}
          />
        ) : screenClock ? (
          <ScreenClockDisplay />
        ) : screenBorder ? (
          <ScreenBorderDisplay />
        ) : screenTitleBar ? (
          <ScreenTitleBarDisplay title={widget.title || "数据大屏标题"} />
        ) : isRichTextEmpty(html) ? (
          <p
            className={cn(
              "flex h-full items-center justify-center text-gray-400",
              inShapeShell ? "px-2 text-theme-xs" : "p-3 text-theme-sm",
            )}
          >
            双击编辑文字
          </p>
        ) : (
          <div
            className={cn(
              "rich-main-class text-gray-700 dark:text-gray-300",
              inShapeShell ? "px-2 py-1.5" : "p-4",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );

  if (inShapeShell && nested) {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        {mode === "edit" ? (
          <TabNestedDragRail widgetId={widget.id} className="h-full w-7" />
        ) : null}
        {content}
      </div>
    );
  }

  return content;
}

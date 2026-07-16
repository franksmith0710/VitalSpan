import type { LucideIcon } from "lucide-react";
import { GripVertical, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WidgetInlineTitle } from "./WidgetInlineTitle";
import { useTabChildExtract } from "./pixelCanvas/tabChildExtractContext";

type TabChildWidgetChromeProps = {
  widgetId: string;
  title: string;
  selected?: boolean;
  mode: "edit" | "view";
  icon?: LucideIcon;
  editable?: boolean;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onSelect?: () => void;
  children: React.ReactNode;
};

export function TabChildWidgetChrome({
  widgetId,
  title,
  selected = false,
  mode,
  icon: Icon,
  editable = false,
  onTitleChange,
  onDelete,
  onSelect,
  children,
}: TabChildWidgetChromeProps) {
  const { beginExtract, extractingWidgetId } = useTabChildExtract();
  const extracting = extractingWidgetId === widgetId;

  return (
    <div
      className={cn(
        "tab-child-widget flex h-full min-h-[10rem] flex-col overflow-hidden rounded-lg border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        selected && "dashboard-widget-selected border-gray-400 ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40",
        !selected && "border-gray-200 dark:border-gray-800",
        extracting && "opacity-60 ring-2 ring-brand-400/50",
      )}
    >
      {mode === "edit" ? (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 bg-gray-50/90 px-1.5 py-1 dark:border-gray-800 dark:bg-white/[0.04]">
          <button
            type="button"
            className="tab-child-extract-handle flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-brand-500 active:cursor-grabbing dark:hover:bg-white/5 dark:hover:text-brand-400"
            aria-label="拖出页签到画布"
            title="拖出页签到画布"
            onPointerDown={(event) => beginExtract(widgetId, event)}
          >
            <GripVertical className="size-3.5" aria-hidden />
          </button>
          {Icon ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
              <Icon className="size-3.5" aria-hidden />
            </span>
          ) : null}
          <WidgetInlineTitle
            value={title}
            editable={editable}
            onChange={onTitleChange}
            ariaLabel="组件标题"
            testId={`widget-inline-title-${widgetId}`}
          />
          {onDelete ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-no-drag ml-auto size-7 shrink-0 text-gray-400 hover:text-error-600"
              aria-label="删除组件"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      ) : null}
      <div
        role={mode === "edit" ? "button" : undefined}
        tabIndex={mode === "edit" ? 0 : undefined}
        onClick={
          mode === "edit"
            ? (event) => {
                event.stopPropagation();
                onSelect?.();
              }
            : undefined
        }
        className={cn(
          "dashboard-no-drag flex min-h-0 flex-1 flex-col",
          mode === "edit" && "cursor-pointer",
        )}
      >
        {children}
      </div>
    </div>
  );
}

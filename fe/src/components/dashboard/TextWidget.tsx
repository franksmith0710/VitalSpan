import { GripVertical, Trash2, Type } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";

type TextWidgetProps = {
  widget: LayoutWidget & { textConfig: TextWidgetConfig };
  mode: "edit" | "view";
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
};

function renderContent(content: string, variant: TextWidgetConfig["variant"]) {
  if (variant === "markdown") {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {content.split("\n").map((line, i) => (
          <p key={i} className="mb-1 last:mb-0">
            {line || "\u00a0"}
          </p>
        ))}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap text-theme-sm text-gray-700 dark:text-gray-300">{content}</p>;
}

export function TextWidget({
  widget,
  mode,
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
}: TextWidgetProps) {
  const cfg = widget.textConfig;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        selected && "dashboard-widget-selected",
        selected
          ? "border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40"
          : "border-gray-200 dark:border-gray-800",
      )}
    >
      {mode === "edit" ? (
        <div
          className={cn(
            "dashboard-drag-handle flex shrink-0 cursor-grab items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 active:cursor-grabbing dark:border-gray-800 dark:bg-white/[0.04]",
            selected && "bg-gray-100/90 dark:bg-white/[0.06]",
          )}
          role="group"
          aria-label="拖动以移动组件"
        >
          <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
            <Type className="size-3.5" aria-hidden />
          </span>
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="dashboard-no-drag h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-theme-sm font-medium shadow-none"
            aria-label="富文本标题"
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
      ) : null}

      <div
        role={mode === "edit" ? "button" : undefined}
        tabIndex={mode === "edit" ? 0 : undefined}
        onClick={mode === "edit" ? () => onSelect?.() : undefined}
        className={cn(
          "dashboard-no-drag min-h-0 flex-1 overflow-auto p-3",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
      >
        {renderContent(cfg.content, cfg.variant)}
      </div>
    </div>
  );
}

import { useState } from "react";
import { GripVertical, ImageIcon, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, MediaWidgetConfig } from "./layoutUtils";

type MediaWidgetProps = {
  widget: LayoutWidget & { mediaConfig: MediaWidgetConfig };
  mode: "edit" | "view";
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
};

export function MediaWidget({
  widget,
  mode,
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
}: MediaWidgetProps) {
  const cfg = widget.mediaConfig;
  const [broken, setBroken] = useState(false);
  const showImage = cfg.url.trim() && !broken;

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
            <ImageIcon className="size-3.5" aria-hidden />
          </span>
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="dashboard-no-drag h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-theme-sm font-medium shadow-none"
            aria-label="媒体标题"
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
          "dashboard-no-drag relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
      >
        {showImage ? (
          <img
            src={cfg.url}
            alt={cfg.alt || widget.title}
            className="max-h-full max-w-full"
            style={{ objectFit: cfg.fit }}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-gray-400">
            <ImageIcon className="size-10 opacity-40" aria-hidden />
            <p className="text-theme-xs">{cfg.url ? "图片加载失败" : "在右侧配置图片 URL"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

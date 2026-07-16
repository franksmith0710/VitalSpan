import { useState } from "react";
import { ExternalLink, GripVertical, ImageIcon, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TabChildWidgetChrome } from "./TabChildWidgetChrome";
import type { DashboardWidgetShell } from "./dashboardCanvasMode";
import { WidgetInlineTitle } from "./WidgetInlineTitle";
import type { LayoutWidget, MediaWidgetConfig } from "./layoutUtils";
import { mediaAlignToObjectPosition, normalizeMediaConfig } from "./layoutUtils";

type MediaWidgetProps = {
  widget: LayoutWidget & { mediaConfig: MediaWidgetConfig };
  mode: "edit" | "view";
  shell?: DashboardWidgetShell;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
};

export function MediaWidget({
  widget,
  mode,
  shell = "grid",
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
}: MediaWidgetProps) {
  const cfg = normalizeMediaConfig(widget.mediaConfig);
  const [broken, setBroken] = useState(false);
  const showImage = cfg.url.trim() && !broken;
  const inShapeShell = shell === "shape";
  const inTabChildShell = shell === "tab-child";
  const showGridChrome = shell === "grid";
  const linkUrl = cfg.linkUrl?.trim();
  const isViewLink = mode === "view" && Boolean(linkUrl);

  const imageNode = showImage ? (
    <img
      src={cfg.url}
      alt={cfg.alt || widget.title}
      className="size-full max-h-full max-w-full"
      style={{
        objectFit: cfg.fit,
        objectPosition: mediaAlignToObjectPosition(cfg.align),
        opacity: cfg.opacity ?? 1,
        borderRadius: cfg.borderRadius ? `${cfg.borderRadius}px` : undefined,
      }}
      onError={() => setBroken(true)}
    />
  ) : (
    <div className="flex flex-col items-center gap-2 text-center text-gray-400">
      <ImageIcon className="size-10 opacity-40" aria-hidden />
      <p className="text-theme-xs">{cfg.url ? "图片加载失败" : "在右侧配置图片"}</p>
    </div>
  );

  const content = isViewLink ? (
    <a
      href={linkUrl}
      target={cfg.linkNewTab ? "_blank" : undefined}
      rel={cfg.linkNewTab ? "noopener noreferrer" : undefined}
      className="group/link relative flex size-full min-h-0 items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      {imageNode}
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/45 p-1 text-white opacity-0 transition-opacity group-hover/link:opacity-100">
        <ExternalLink className="size-3.5" aria-hidden />
      </span>
    </a>
  ) : (
    imageNode
  );

  const body = (
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
      onPointerDown={mode === "edit" ? (event) => event.stopPropagation() : undefined}
      className={cn(
        "dashboard-no-drag relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2",
        mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
      )}
      style={{
        backgroundColor: cfg.background?.trim() || undefined,
      }}
    >
      {content}
    </div>
  );

  if (inTabChildShell) {
    return (
      <TabChildWidgetChrome
        widgetId={widget.id}
        title={widget.title}
        selected={selected}
        mode={mode}
        icon={ImageIcon}
        editable={Boolean(onTitleChange)}
        onTitleChange={onTitleChange ? (next) => onTitleChange(widget.id, next) : undefined}
        onDelete={onDelete ? () => onDelete(widget.id) : undefined}
        onSelect={onSelect}
      >
        {body}
      </TabChildWidgetChrome>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        showGridChrome && "overflow-hidden rounded-xl border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        showGridChrome && selected && "dashboard-widget-selected",
        showGridChrome &&
          selected &&
          "border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40",
        showGridChrome && !selected && "border-gray-200 dark:border-gray-800",
      )}
    >
      {showGridChrome && mode === "edit" ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.04]">
          <div
            className="dashboard-drag-handle flex shrink-0 cursor-grab items-center active:cursor-grabbing"
            role="group"
            aria-label="拖动以移动组件"
          >
            <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
            <ImageIcon className="size-3.5" aria-hidden />
          </span>
          <WidgetInlineTitle
            value={widget.title}
            editable={Boolean(onTitleChange)}
            onChange={onTitleChange ? (next) => onTitleChange(widget.id, next) : undefined}
            ariaLabel="媒体标题"
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
        onPointerDown={mode === "edit" ? (event) => event.stopPropagation() : undefined}
        className={cn(
          "dashboard-no-drag relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
        style={{
          backgroundColor: cfg.background?.trim() || undefined,
        }}
      >
        {content}
      </div>
    </div>
  );
}

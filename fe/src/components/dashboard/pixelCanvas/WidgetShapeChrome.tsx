import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { WidgetInlineTitle } from "../WidgetInlineTitle";

export type WidgetShapeChromeProps = {
  title: string;
  titleStyle: CSSProperties;
  showTitle: boolean;
  remark?: { show: boolean; text: string };
  mode: "edit" | "view";
  selected: boolean;
  widgetId: string;
  onTitleChange?: (widgetId: string, title: string) => void;
  onDragPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * DE `.shape` 内标题区：无独立 chrome 条/边框，与组件内容同属 shape 内边距。
 */
export function WidgetShapeChrome({
  title,
  titleStyle,
  showTitle,
  remark,
  mode,
  selected,
  widgetId,
  onTitleChange,
  onDragPointerDown,
  onDragKeyDown,
}: WidgetShapeChromeProps) {
  if (!showTitle) {
    return (
      <span className="sr-only" data-testid={`pixel-shape-title-sr-${widgetId}`}>
        {title}
      </span>
    );
  }

  const isEdit = mode === "edit";
  const canDrag = isEdit && selected && Boolean(onDragPointerDown);
  const canEditTitle = isEdit && Boolean(onTitleChange);
  const showRemark = Boolean(remark?.show && remark.text);

  return (
    <>
      <div
        data-testid={`pixel-shape-chrome-${widgetId}`}
        className={cn(
          "shape-title shrink-0",
          canDrag && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={canDrag ? onDragPointerDown : undefined}
        onKeyDown={canDrag ? onDragKeyDown : undefined}
        role={canDrag ? "group" : undefined}
        aria-label={canDrag ? "拖动组件" : undefined}
        tabIndex={canDrag ? 0 : undefined}
      >
        <WidgetInlineTitle
          value={title}
          editable={canEditTitle}
          onChange={canEditTitle ? (next) => onTitleChange?.(widgetId, next) : undefined}
          titleStyle={titleStyle}
          testId={`pixel-shape-title-${widgetId}`}
        />
      </div>
      {showRemark ? (
        <p
          className="shape-remark shrink-0 text-[11px] leading-snug text-gray-500 dark:text-gray-400"
          data-testid={`pixel-shape-remark-${widgetId}`}
        >
          {remark!.text}
        </p>
      ) : null}
    </>
  );
}

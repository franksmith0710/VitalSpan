import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WidgetInlineTitleProps = {
  value: string;
  onChange?: (value: string) => void;
  editable?: boolean;
  titleStyle?: CSSProperties;
  ariaLabel?: string;
  testId?: string;
  className?: string;
};

/**
 * DataEase 式组件标题：默认纯文字；点击后进入内联编辑。
 */
export function WidgetInlineTitle({
  value,
  onChange,
  editable = false,
  titleStyle,
  ariaLabel = "组件标题",
  testId,
  className,
}: WidgetInlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const stopBubble = (event: MouseEvent) => {
    event.stopPropagation();
  };

  if (!editable || !onChange) {
    return (
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90",
          className,
        )}
        style={titleStyle}
        data-testid={testId}
      >
        {value}
      </span>
    );
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        size="sm"
        inputSkin="borderless"
        onChange={(e) => onChange(e.target.value)}
        onMouseDown={stopBubble}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className={cn(
          "dashboard-no-drag h-7 min-w-0 flex-1 px-1 py-0 font-semibold text-gray-800 shadow-none focus-visible:ring-2 focus-visible:ring-brand-500/25 dark:text-white/90",
          className,
        )}
        style={titleStyle}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <span
      className={cn(
        "dashboard-no-drag min-w-0 flex-1 cursor-text truncate rounded px-1 text-theme-sm font-semibold text-gray-800 hover:bg-gray-100/80 dark:text-white/90 dark:hover:bg-white/5",
        className,
      )}
      style={titleStyle}
      data-testid={testId}
      onMouseDown={stopBubble}
      onClick={(e) => {
        stopBubble(e);
        setEditing(true);
      }}
      onDoubleClick={(e) => {
        stopBubble(e);
        setEditing(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }
      }}
    >
      {value}
    </span>
  );
}

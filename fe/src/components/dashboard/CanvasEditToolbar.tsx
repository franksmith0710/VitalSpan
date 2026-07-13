import { forwardRef, useState, type ReactNode } from "react";
import {
  Copy,
  Filter,
  Image,
  LayoutGrid,
  MoreHorizontal,
  PanelsTopLeft,
  Palette,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PaletteInsertType } from "./createLayoutWidget";
import { ChartPickerPopover } from "./ChartPickerPopover";
import { QueryComponentPicker } from "./QueryComponentPicker";

type CanvasEditToolbarProps = {
  onInsert: (type: PaletteInsertType) => void;
  onOpenReuse?: () => void;
  onOpenDashboardStyle?: () => void;
  onOpenLinkage?: () => void;
};

const ToolbarNavButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    label: string;
    active?: boolean;
    testId?: string;
  }
>(function ToolbarNavButton(
  { icon, label, active, disabled, title, onClick, testId, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      data-testid={testId}
      {...props}
      className={cn(
        "flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-theme-xs transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
        className,
      )}
    >
      <span className="flex size-6 items-center justify-center [&_svg]:size-[18px]">{icon}</span>
      <span className="max-w-[56px] truncate leading-tight">{label}</span>
    </button>
  );
});

/** 对标 DataEase toolbar middle-area */
export function CanvasEditToolbar({
  onInsert,
  onOpenReuse,
  onOpenDashboardStyle,
  onOpenLinkage,
}: CanvasEditToolbarProps) {
  const [chartOpen, setChartOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-0.5"
      data-testid="canvas-edit-toolbar"
    >
      <DropdownMenu open={chartOpen} onOpenChange={setChartOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <ToolbarNavButton
            icon={<LayoutGrid aria-hidden />}
            label="图表"
            active={chartOpen}
            testId="palette-toolbar-toggle"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[min(100vw-2rem,410px)] max-h-[min(70vh,420px)] overflow-y-auto p-4"
          data-testid="palette-dropdown-menu"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <ChartPickerPopover
            onInsert={onInsert}
            onInserted={() => setChartOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={queryOpen} onOpenChange={setQueryOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <ToolbarNavButton
            icon={<Filter aria-hidden />}
            label="查询组件"
            active={queryOpen}
            testId="toolbar-query-toggle"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[min(100vw-2rem,320px)] p-4"
          data-testid="query-dropdown-menu"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <QueryComponentPicker
            onInsert={onInsert}
            onInserted={() => setQueryOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarNavButton
        icon={<Type aria-hidden />}
        label="富文本"
        testId="toolbar-insert-text"
        onClick={() => onInsert("text")}
      />

      <ToolbarNavButton
        icon={<Image aria-hidden />}
        label="媒体"
        testId="toolbar-insert-media"
        onClick={() => onInsert("media")}
      />

      <ToolbarNavButton
        icon={<PanelsTopLeft aria-hidden />}
        label="Tab"
        testId="toolbar-insert-tabs"
        onClick={() => onInsert("tabs")}
      />

      <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <ToolbarNavButton
            icon={<MoreHorizontal aria-hidden />}
            label="更多"
            active={moreOpen}
            testId="toolbar-more-toggle"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]" data-testid="toolbar-more-menu">
          <DropdownMenuItem
            onClick={() => {
              onOpenDashboardStyle?.();
              setMoreOpen(false);
            }}
          >
            <Palette className="size-4" aria-hidden />
            仪表板样式
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onOpenLinkage?.();
              setMoreOpen(false);
            }}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            外部参数
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarNavButton
        icon={<Copy aria-hidden />}
        label="复用"
        testId="toolbar-open-reuse"
        onClick={() => onOpenReuse?.()}
      />
    </div>
  );
}

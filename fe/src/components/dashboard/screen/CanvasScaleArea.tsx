import { Minus, Plus, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DATA_SCREEN_ZOOM_PRESETS,
  formatDataScreenZoomPercent,
} from "./dataScreenViewportZoom";

export type CanvasScaleAreaProps = {
  userZoom: number;
  spacePanActive?: boolean;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetViewport: () => void;
  className?: string;
};

/** 大屏编辑画布右下角缩放 HUD（对标 DE `.scale-area`） */
export function CanvasScaleArea({
  userZoom,
  spacePanActive = false,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onResetViewport,
  className,
}: CanvasScaleAreaProps) {
  const zoomValue = String(userZoom);

  return (
    <div
      data-canvas-scale-area
      className={cn(
        "absolute right-3 bottom-3 z-20 flex max-w-[min(100%,24rem)] items-center gap-2 rounded-lg border border-white/10 bg-[#0d1117]/90 px-2.5 py-1.5 text-[11px] text-white/75 shadow-lg backdrop-blur-sm select-none",
        spacePanActive && "border-cyan-500/40 text-cyan-50/90",
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="hidden min-w-0 truncate sm:block">
        <span className={spacePanActive ? "text-cyan-200" : undefined}>空格拖动画布</span>
        <span className="mx-1.5 text-white/30">·</span>
        <span>Ctrl+滚轮缩放</span>
      </p>
      <div className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" aria-hidden />
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          className="size-7 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="缩小画布"
          onClick={onZoomOut}
        >
          <Minus className="size-3.5" aria-hidden />
        </IconButton>
        <Select
          value={zoomValue}
          onValueChange={(value) => onZoomChange(Number(value))}
        >
          <SelectTrigger
            className="h-7 w-[4.25rem] border-white/15 bg-white/5 px-2 text-[11px] text-white hover:bg-white/10"
            aria-label="画布缩放比例"
          >
            <SelectValue>{formatDataScreenZoomPercent(userZoom)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" className="min-w-[5.5rem]">
            {DATA_SCREEN_ZOOM_PRESETS.map((preset) => (
              <SelectItem key={preset} value={String(preset)} textValue={formatDataScreenZoomPercent(preset)}>
                {formatDataScreenZoomPercent(preset)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          className="size-7 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="放大画布"
          onClick={onZoomIn}
        >
          <Plus className="size-3.5" aria-hidden />
        </IconButton>
      </div>
      <div className="hidden h-4 w-px shrink-0 bg-white/15 md:block" aria-hidden />
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        className="hidden size-7 text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
        aria-label="重置视口"
        title="重置平移与缩放"
        onClick={onResetViewport}
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </IconButton>
    </div>
  );
}

import { Link } from "react-router";
import { ChevronLeft, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PresentationMode } from "./presentationScale";

const MODE_LABELS: Record<PresentationMode, string> = {
  fit: "等比适应",
  fitWidth: "宽度优先",
  fitHeight: "高度优先",
  fill: "铺满全屏",
  none: "不缩放",
};

export type ScreenPreviewChromeProps = {
  title: string;
  editPath: string;
  presentationMode: PresentationMode;
  onPresentationModeChange: (mode: PresentationMode) => void;
  onFullscreen: () => void;
};

export function ScreenPreviewChrome({
  title,
  editPath,
  presentationMode,
  onPresentationModeChange,
  onFullscreen,
}: ScreenPreviewChromeProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-3 py-2 text-white backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
          <Link to={editPath}>
            <ChevronLeft className="size-4" aria-hidden />
            返回编辑
          </Link>
        </Button>
        <h1 className="truncate text-sm font-medium tracking-wide text-cyan-50">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select
          value={presentationMode}
          onValueChange={(value) => onPresentationModeChange(value as PresentationMode)}
        >
          <SelectTrigger className="h-8 w-[120px] border-white/15 bg-white/5 text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODE_LABELS) as PresentationMode[]).map((mode) => (
              <SelectItem key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          onClick={onFullscreen}
        >
          <Maximize2 className="size-4" aria-hidden />
          全屏
        </Button>
      </div>
    </header>
  );
}

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DashboardAlignmentSnapConfig, DashboardChromeConfig } from "./dashboardStyleConfig";
import {
  MAX_GRID_CELL_PX,
  MAX_MARK_LINE_THRESHOLD_PX,
  MIN_GRID_CELL_PX,
  MIN_MARK_LINE_THRESHOLD_PX,
  resolveDashboardAlignmentSnap,
  resolveDashboardChrome,
} from "./dashboardChromeConfig";
import { DeAttrSubField, DeAttrToggleRow } from "./dashboardInspectorUi";
import { DeAttrSubSliderRow } from "./deAttrSlider";
import { INSPECTOR_SWITCH_SIZE } from "./inspectorCompact";

type AlignmentSnapControlsProps = {
  chrome: ReturnType<typeof resolveDashboardChrome>;
  alignment: ReturnType<typeof resolveDashboardAlignmentSnap>;
  alignmentSnapRaw?: DashboardAlignmentSnapConfig;
  isPixelLayout: boolean;
  patchChrome: (patch: Partial<DashboardChromeConfig>) => void;
};

function AlignmentSnapDetails({
  alignment,
  alignmentSnapRaw,
  patchChrome,
}: {
  alignment: ReturnType<typeof resolveDashboardAlignmentSnap>;
  alignmentSnapRaw?: DashboardAlignmentSnapConfig;
  patchChrome: (patch: Partial<DashboardChromeConfig>) => void;
}) {
  const snapConfig = (patch: Partial<DashboardAlignmentSnapConfig>) =>
    patchChrome({
      alignmentSnap: {
        ...alignmentSnapRaw,
        ...patch,
      },
    });

  return (
    <div className="space-y-0 border-t border-gray-100 pt-1 dark:border-white/[0.06]">
      <DeAttrToggleRow
        label="组件对齐吸附"
        checked={alignment.enableMarkLineSnap}
        onCheckedChange={(checked) => snapConfig({ enableMarkLineSnap: checked })}
      />
      <DeAttrSubSliderRow
        label="重合阈值"
        value={alignment.markLineThresholdPx}
        min={MIN_MARK_LINE_THRESHOLD_PX}
        max={MAX_MARK_LINE_THRESHOLD_PX}
        step={1}
        unit="px"
        ariaLabel="重合阈值"
        description="靠近其他组件边/中心多少屏幕像素内触发吸附"
        onChange={(markLineThresholdPx) => snapConfig({ markLineThresholdPx })}
      />
      <DeAttrSubField label="吸附目标">
        <DeAttrToggleRow
          label="边线（贴边/对齐边）"
          checked={alignment.snapEdges}
          onCheckedChange={(checked) => snapConfig({ snapEdges: checked })}
        />
        <DeAttrToggleRow
          label="中心线"
          checked={alignment.snapCenters}
          onCheckedChange={(checked) => snapConfig({ snapCenters: checked })}
        />
      </DeAttrSubField>
      <DeAttrToggleRow
        label="网格步长吸附"
        checked={alignment.enableGridSnap}
        onCheckedChange={(checked) => snapConfig({ enableGridSnap: checked })}
      />
      <DeAttrSubSliderRow
        label="网格步长"
        value={alignment.gridCellPx}
        min={MIN_GRID_CELL_PX}
        max={MAX_GRID_CELL_PX}
        step={1}
        unit="px"
        ariaLabel="网格步长"
        description={
          alignment.enableGridSnap
            ? "与辅助网格点阵一致；开启步长吸附后落点按此间距取整"
            : "仅影响点阵显示密度"
        }
        onChange={(gridCellPx) => snapConfig({ gridCellPx })}
      />
    </div>
  );
}

/** 像素大屏：辅助网格开关 + 可折叠对齐吸附细项 */
export function AlignmentSnapControls({
  chrome,
  alignment,
  alignmentSnapRaw,
  isPixelLayout,
  patchChrome,
}: AlignmentSnapControlsProps) {
  const [open, setOpen] = useState(false);

  if (!isPixelLayout) {
    return (
      <div className="border-b border-gray-100 py-2.5 last:border-b-0 dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 text-theme-xs text-gray-600 dark:text-gray-300">
            辅助对齐网格
          </span>
          <Switch
            checked={chrome.showAuxiliaryGrid}
            onCheckedChange={(checked) => patchChrome({ showAuxiliaryGrid: checked })}
            aria-label="辅助对齐网格"
            size={INSPECTOR_SWITCH_SIZE}
          />
        </div>
      </div>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group border-b border-gray-100 last:border-b-0 dark:border-white/[0.06]"
      data-testid="alignment-snap-section"
    >
      <div className="flex items-center gap-1 py-2.5">
        <CollapsibleTrigger
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 rounded-md py-0.5 pr-1 text-left",
            "text-theme-xs text-gray-600 dark:text-gray-300",
            "transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
            "dark:hover:bg-white/[0.04]",
          )}
          aria-label={open ? "收起对齐吸附设置" : "展开对齐吸附设置"}
        >
          <ChevronRight
            className="size-3.5 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-90"
            aria-hidden
          />
          <span className="min-w-0 truncate">辅助对齐网格</span>
        </CollapsibleTrigger>
        <div
          className="shrink-0 pl-1"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Switch
            checked={chrome.showAuxiliaryGrid}
            onCheckedChange={(checked) => patchChrome({ showAuxiliaryGrid: checked })}
            aria-label="辅助对齐网格"
            size={INSPECTOR_SWITCH_SIZE}
          />
        </div>
      </div>
      <CollapsibleContent data-testid="alignment-snap-controls" className="pb-2 pl-5">
        <AlignmentSnapDetails
          alignment={alignment}
          alignmentSnapRaw={alignmentSnapRaw}
          patchChrome={patchChrome}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

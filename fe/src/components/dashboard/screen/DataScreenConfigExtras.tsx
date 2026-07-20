import { Download, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";
import type { DashboardStyleConfig } from "@/components/dashboard/dashboardStyleConfig";
import { DE_SELECT } from "@/components/dashboard/dashboardInspectorUi";
import { exportDataScreenTemplate } from "@/lib/dataScreenTemplates";
import { downloadJsonFile, downloadLayoutJson } from "@/lib/exportLayoutJson";
import {
  DATA_SCREEN_CANVAS_PRESETS,
  resolveDataScreenCanvasPresetId,
  type DataScreenCanvasPresetId,
} from "@/lib/surfacePreset";

type DataScreenConfigExtrasProps = {
  layout: DashboardLayoutV2;
  styleConfig: DashboardStyleConfig;
  widgets: DashboardLayoutV2["widgets"];
  name: string;
  canSave: boolean;
  onCanvasPresetChange: (presetId: DataScreenCanvasPresetId) => void;
};

function buildExportLayout(
  layout: DashboardLayoutV2,
  widgets: DashboardLayoutV2["widgets"],
  styleConfig: DashboardStyleConfig,
): DashboardLayoutV2 {
  return {
    ...layout,
    widgets,
    styleConfig: { ...styleConfig, surfaceKind: "data-screen" },
    globalFilters: layout.globalFilters ?? [],
  };
}

export function DataScreenConfigExtras({
  layout,
  styleConfig,
  widgets,
  name,
  canSave,
  onCanvasPresetChange,
}: DataScreenConfigExtrasProps) {
  if (layout.version !== 2) return null;

  const presetId = resolveDataScreenCanvasPresetId(layout.canvas);
  const exportLayout = buildExportLayout(layout, widgets, styleConfig);

  return (
    <section
      className="shrink-0 space-y-3 border-b border-gray-100 pb-4 dark:border-white/[0.06]"
      data-testid="data-screen-config-extras"
    >
      <div>
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">大屏工具</p>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          导出与画布比例（切换比例不自动缩放已有组件）
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-theme-xs text-gray-500 dark:text-gray-400">画布比例</label>
        <Select
          value={presetId}
          onValueChange={(value) => onCanvasPresetChange(value as DataScreenCanvasPresetId)}
        >
          <SelectTrigger className={DE_SELECT} aria-label="画布比例">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(DATA_SCREEN_CANVAS_PRESETS) as DataScreenCanvasPresetId[]).map((id) => (
              <SelectItem key={id} value={id}>
                {DATA_SCREEN_CANVAS_PRESETS[id].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          disabled={!canSave}
          onClick={() => {
            downloadLayoutJson(exportLayout, name);
            toast.success("布局 JSON 已下载");
          }}
        >
          <FileJson className="size-4" aria-hidden />
          导出布局 JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          disabled={!canSave}
          onClick={() => {
            const payload = exportDataScreenTemplate(exportLayout, name);
            downloadJsonFile(payload, `${name.trim() || "screen"}-template.json`);
            toast.success("模板 JSON 已下载");
          }}
        >
          <Download className="size-4" aria-hidden />
          导出为模板
        </Button>
      </div>
    </section>
  );
}

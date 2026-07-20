import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Download, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DATA_SCREEN_CANVAS_BOUNDS } from "@/lib/surfacePreset";
import type { PresentationMode } from "./presentationScale";

const PRESENTATION_MODE_LABELS: Record<PresentationMode, string> = {
  fit: "等比适应",
  fitWidth: "宽度优先",
  fitHeight: "高度优先",
  fill: "铺满视口",
  none: "不缩放",
};

type DataScreenConfigExtrasProps = {
  layout: DashboardLayoutV2;
  styleConfig: DashboardStyleConfig;
  widgets: DashboardLayoutV2["widgets"];
  name: string;
  canSave: boolean;
  presentationMode: PresentationMode;
  onPresentationModeChange: (mode: PresentationMode) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
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

function CanvasSizeField({
  id,
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef(value);

  useEffect(() => {
    setDraft(String(value));
    lastAppliedRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const applyValue = (parsed: number) => {
    if (!Number.isFinite(parsed) || parsed === lastAppliedRef.current) return;
    lastAppliedRef.current = parsed;
    onCommit(parsed);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= min && parsed <= max) {
      applyValue(parsed);
      return;
    }
    debounceRef.current = setTimeout(() => applyValue(parsed), 400);
  };

  const flushDraft = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    applyValue(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      flushDraft();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(String(value));
      event.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-theme-xs text-gray-500 dark:text-gray-400" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft}
        disabled={disabled}
        className="h-8"
        onChange={(event) => handleChange(event.target.value)}
        onBlur={flushDraft}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export function DataScreenConfigExtras({
  layout,
  styleConfig,
  widgets,
  name,
  canSave,
  presentationMode,
  onPresentationModeChange,
  onCanvasSizeChange,
}: DataScreenConfigExtrasProps) {
  if (layout.version !== 2) return null;

  const exportLayout = buildExportLayout(layout, widgets, styleConfig);

  return (
    <section
      className="shrink-0 space-y-3 border-b border-gray-100 pb-4 dark:border-white/[0.06]"
      data-testid="data-screen-config-extras"
    >
      <div>
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">大屏工具</p>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          画布尺寸、编辑区缩放与导出（输入后实时预览，越界组件自动收进画布）
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CanvasSizeField
          id="screen-canvas-w"
          label="W"
          value={layout.canvas.width}
          min={DATA_SCREEN_CANVAS_BOUNDS.minWidth}
          max={DATA_SCREEN_CANVAS_BOUNDS.maxWidth}
          disabled={!canSave}
          onCommit={(width) => onCanvasSizeChange(width, layout.canvas.height)}
        />
        <CanvasSizeField
          id="screen-canvas-h"
          label="H"
          value={layout.canvas.height}
          min={DATA_SCREEN_CANVAS_BOUNDS.minHeight}
          max={DATA_SCREEN_CANVAS_BOUNDS.maxHeight}
          disabled={!canSave}
          onCommit={(height) => onCanvasSizeChange(layout.canvas.width, height)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-theme-xs text-gray-500 dark:text-gray-400">缩放方式</label>
        <Select
          value={presentationMode}
          onValueChange={(value) => onPresentationModeChange(value as PresentationMode)}
        >
          <SelectTrigger className={DE_SELECT} aria-label="编辑区缩放方式">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESENTATION_MODE_LABELS) as PresentationMode[]).map((mode) => (
              <SelectItem key={mode} value={mode}>
                {PRESENTATION_MODE_LABELS[mode]}
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

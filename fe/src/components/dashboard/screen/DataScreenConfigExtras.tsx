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
import { DATA_SCREEN_CANVAS_BOUNDS, DATA_SCREEN_CANVAS_PRESETS } from "@/lib/surfacePreset";
import type { PresentationMode } from "./presentationScale";
import {
  DATA_SCREEN_EDIT_PRESENTATION_MODES,
  DATA_SCREEN_EDIT_PRESENTATION_DEFAULT,
} from "./presentationScale";

const PRESENTATION_MODE_LABELS: Record<
  (typeof DATA_SCREEN_EDIT_PRESENTATION_MODES)[number],
  string
> = {
  fit: "等比适应",
  fitWidth: "宽度优先",
  fitHeight: "高度优先",
};

const PRESENTATION_MODE_HINTS: Record<
  (typeof DATA_SCREEN_EDIT_PRESENTATION_MODES)[number],
  string
> = {
  fitWidth: "宽度优先：编辑区宽度贴满；改 W 会改变纵向比例，改 H 改变可见高度",
  fitHeight: "高度优先：编辑区高度贴满；改 H 会改变横向比例，改 W 改变可见宽度",
  fit: "等比适应：整画布缩放进视口；改 W/H 同时影响设计分辨率与缩放",
};

function resolvePresentationHint(mode: PresentationMode): string {
  if ((DATA_SCREEN_EDIT_PRESENTATION_MODES as readonly PresentationMode[]).includes(mode)) {
    return PRESENTATION_MODE_HINTS[mode as (typeof DATA_SCREEN_EDIT_PRESENTATION_MODES)[number]];
  }
  return PRESENTATION_MODE_HINTS[DATA_SCREEN_EDIT_PRESENTATION_DEFAULT];
}

type CanvasSizePatch = { width?: number; height?: number };

type DataScreenConfigExtrasProps = {
  layout: DashboardLayoutV2;
  styleConfig: DashboardStyleConfig;
  widgets: DashboardLayoutV2["widgets"];
  name: string;
  canSave: boolean;
  presentationMode: PresentationMode;
  onPresentationModeChange: (mode: PresentationMode) => void;
  onCanvasSizeChange: (patch: CanvasSizePatch) => void;
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
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">画布</p>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {resolvePresentationHint(presentationMode)}
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
          onCommit={(width) => onCanvasSizeChange({ width })}
        />
        <CanvasSizeField
          id="screen-canvas-h"
          label="H"
          value={layout.canvas.height}
          min={DATA_SCREEN_CANVAS_BOUNDS.minHeight}
          max={DATA_SCREEN_CANVAS_BOUNDS.maxHeight}
          disabled={!canSave}
          onCommit={(height) => onCanvasSizeChange({ height })}
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
            {DATA_SCREEN_EDIT_PRESENTATION_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {PRESENTATION_MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(DATA_SCREEN_CANVAS_PRESETS) as Array<keyof typeof DATA_SCREEN_CANVAS_PRESETS>).map(
          (presetId) => {
            const preset = DATA_SCREEN_CANVAS_PRESETS[presetId];
            return (
              <Button
                key={presetId}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-theme-xs"
                disabled={!canSave}
                onClick={() =>
                  onCanvasSizeChange({ width: preset.width, height: preset.height })
                }
              >
                {preset.label}
              </Button>
            );
          },
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
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

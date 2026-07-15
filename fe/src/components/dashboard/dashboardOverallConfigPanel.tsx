import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DebouncedNumberInput } from "@/components/ui/debounced-number-input";
import {
  DASHBOARD_FONT_OPTIONS,
  DASHBOARD_QUERY_LIMIT_PRESETS,
  DASHBOARD_REFRESH_PRESETS,
  buildDashboardGapPatch,
  dashboardFontSelectValue,
  resolveDashboardFontOptionValue,
  resolveDashboardGapUiState,
  resolveDashboardQueryLimitPreset,
  resolveDashboardRefreshPreset,
  type DashboardStyleConfig,
  type GapPreset,
} from "./dashboardStyleConfig";
import { resolveDashboardChrome, type DashboardChromeConfig } from "./dashboardChromeConfig";
import {
  DE_INPUT,
  DE_SELECT,
  DeAttrField,
  DeAttrForm,
  DeAttrSubField,
  DeAttrToggleRow,
  DeAttrToggleSection,
  DeSegmentGroup,
} from "./dashboardInspectorUi";
import { DeProgressSlider } from "./deAttrSlider";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

type Props = {
  styleConfig: DashboardStyleConfig;
  patchStyle: PatchFn;
  isPixelLayout: boolean;
};

function GapControls({
  hasGap,
  preset,
  customPx,
  customMax,
  onHasGapChange,
  onPresetChange,
  onCustomPx,
}: {
  hasGap: boolean;
  preset: GapPreset;
  customPx: number;
  customMax: number;
  onHasGapChange: (hasGap: boolean) => void;
  onPresetChange: (preset: Exclude<GapPreset, "custom"> | "custom") => void;
  onCustomPx: (px: number) => void;
}) {
  return (
    <DeAttrField label="组件间隙">
      <DeSegmentGroup
        value={hasGap}
        columns={2}
        options={[
          { value: true, label: "有间隙" },
          { value: false, label: "无间隙" },
        ]}
        onChange={(v) => onHasGapChange(v === true)}
      />
      {hasGap ? (
        <DeAttrSubField label="间隙大小">
          <DeSegmentGroup
            value={preset}
            columns={4}
            options={[
              { value: "sm", label: "小" },
              { value: "md", label: "中" },
              { value: "lg", label: "大" },
              { value: "custom", label: "自定义" },
            ]}
            onChange={(v) => onPresetChange(v as Exclude<GapPreset, "custom"> | "custom")}
          />
          {preset === "custom" ? (
            <div className="mt-2 space-y-2" data-testid="dashboard-gap-custom-controls">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>自定义</span>
                <span className="tabular-nums">{customPx}px</span>
              </div>
              <DeProgressSlider
                min={0}
                max={customMax}
                step={1}
                value={Math.max(0, customPx)}
                ariaLabel="自定义间隙滑块"
                ariaValuetext={`${Math.max(0, customPx)}px`}
                onChange={onCustomPx}
              />
              <Input
                type="number"
                min={0}
                max={customMax}
                className={DE_INPUT}
                aria-label="自定义间隙像素"
                value={Math.max(0, customPx)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isNaN(next)) onCustomPx(Math.min(customMax, Math.max(0, next)));
                }}
              />
              <p className="text-[10px] leading-snug text-gray-400 dark:text-gray-500">
                对标 DataEase：每侧 padding 为设定值，相邻组件间距约为 2 倍；栅格与像素预设标尺不同。
              </p>
            </div>
          ) : null}
        </DeAttrSubField>
      ) : null}
    </DeAttrField>
  );
}

function FontSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (fontFamily: string | undefined) => void;
}) {
  const selectValue = dashboardFontSelectValue(value);
  const resolved = resolveDashboardFontOptionValue(value);

  return (
    <DeAttrField label="仪表板字体">
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === "__default__") onChange(undefined);
          else if (next !== "__custom__") onChange(next);
        }}
      >
        <SelectTrigger className={DE_SELECT} aria-label="仪表板字体">
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          {DASHBOARD_FONT_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.label}
              value={opt.value ? opt.value : "__default__"}
              style={opt.value ? { fontFamily: opt.value } : undefined}
            >
              {opt.label}
            </SelectItem>
          ))}
          {selectValue === "__custom__" && resolved ? (
            <SelectItem value="__custom__">{resolved}</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </DeAttrField>
  );
}

function RefreshField({
  refreshIntervalSec,
  onChange,
}: {
  refreshIntervalSec?: number;
  onChange: (sec: number | undefined) => void;
}) {
  const preset = resolveDashboardRefreshPreset(refreshIntervalSec);
  const customMin =
    preset === "custom" && refreshIntervalSec ? Math.max(1, Math.round(refreshIntervalSec / 60)) : "";

  return (
    <DeAttrField label="刷新频率" hint="分享页整体刷新">
      <Select
        value={preset}
        onValueChange={(next) => {
          if (next === "off") onChange(undefined);
          else if (next !== "custom") onChange(Number(next));
          else onChange(refreshIntervalSec && refreshIntervalSec > 0 ? refreshIntervalSec : 300);
        }}
      >
        <SelectTrigger className={DE_SELECT} aria-label="刷新频率">
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          {DASHBOARD_REFRESH_PRESETS.map((opt) => (
            <SelectItem key={opt.label} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" ? (
        <Input
          type="number"
          min={1}
          max={1440}
          className={`${DE_INPUT} mt-2`}
          placeholder="自定义分钟数"
          value={customMin}
          onChange={(e) => {
            const min = e.target.value ? Number(e.target.value) : 0;
            onChange(min > 0 ? min * 60 : undefined);
          }}
        />
      ) : null}
    </DeAttrField>
  );
}

function QueryLimitField({
  defaultQueryLimit,
  onChange,
}: {
  defaultQueryLimit?: number;
  onChange: (limit: number) => void;
}) {
  const preset = resolveDashboardQueryLimitPreset(defaultQueryLimit);
  const limit = defaultQueryLimit ?? 100;

  return (
    <DeAttrField label="图表结果" hint="仪表板默认">
      <Select
        value={preset}
        onValueChange={(next) => {
          if (next !== "custom") onChange(Number(next));
        }}
      >
        <SelectTrigger className={DE_SELECT} aria-label="图表结果数量">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DASHBOARD_QUERY_LIMIT_PRESETS.map((opt) => (
            <SelectItem key={opt.label} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" ? (
        <DebouncedNumberInput
          min={1}
          max={10000}
          className={`${DE_INPUT} mt-2`}
          value={limit}
          onCommit={(value) => onChange(value || 100)}
        />
      ) : null}
    </DeAttrField>
  );
}

export function DashboardOverallConfigPanel({
  styleConfig,
  patchStyle,
  isPixelLayout,
}: Props) {
  const gapUi = resolveDashboardGapUiState(styleConfig, { pixel: isPixelLayout });
  const scaleMode = styleConfig.scaleMode ?? "canvas";
  const ws = styleConfig.widgetStyle ?? {};
  const chrome = resolveDashboardChrome(styleConfig);
  const patchChrome = (patch: Partial<DashboardChromeConfig>) =>
    patchStyle({ chrome: { ...styleConfig.chrome, ...patch } });

  return (
    <DeAttrForm data-testid="dashboard-overall-config-body">
      <FontSelect
        value={styleConfig.fontFamily}
        onChange={(fontFamily) => patchStyle({ fontFamily })}
      />

      <DeAttrField label="组件圆角" hint="px">
        <Input
          type="number"
          min={0}
          max={48}
          className={DE_INPUT}
          placeholder="跟随主题"
          value={ws.borderRadius ?? ""}
          onChange={(e) =>
            patchStyle({
              widgetStyle: {
                ...ws,
                borderRadius: e.target.value ? Number(e.target.value) : undefined,
              },
            })
          }
        />
      </DeAttrField>

      <GapControls
        hasGap={gapUi.hasGap}
        preset={gapUi.preset}
        customPx={gapUi.customPx}
        customMax={gapUi.customMax}
        onHasGapChange={(hasGap) =>
          patchStyle(buildDashboardGapPatch(styleConfig, { type: "toggle", hasGap }, { pixel: isPixelLayout }))
        }
        onPresetChange={(preset) =>
          patchStyle(buildDashboardGapPatch(styleConfig, { type: "preset", preset }, { pixel: isPixelLayout }))
        }
        onCustomPx={(px) =>
          patchStyle(buildDashboardGapPatch(styleConfig, { type: "customPx", px }, { pixel: isPixelLayout }))
        }
      />

      <DeAttrField label="缩放模式">
        <DeSegmentGroup
          value={scaleMode}
          columns={2}
          options={[
            { value: "canvas", label: "画布比例" },
            { value: "component", label: "组件比例" },
          ]}
          onChange={(v) => patchStyle({ scaleMode: v as "canvas" | "component" })}
        />
      </DeAttrField>

      <RefreshField
        refreshIntervalSec={styleConfig.refreshIntervalSec}
        onChange={(refreshIntervalSec) => patchStyle({ refreshIntervalSec })}
      />

      <QueryLimitField
        defaultQueryLimit={styleConfig.defaultQueryLimit}
        onChange={(defaultQueryLimit) => patchStyle({ defaultQueryLimit })}
      />

      <DeAttrToggleSection title="显示与交互">
        <DeAttrToggleRow
          label="图表加载提示"
          checked={chrome.showChartLoadingHint}
          onCheckedChange={(checked) => patchChrome({ showChartLoadingHint: checked })}
        />
        <DeAttrToggleRow
          label="悬浮操作按钮"
          checked={chrome.showFloatingActions}
          onCheckedChange={(checked) => patchChrome({ showFloatingActions: checked })}
        />
        <DeAttrToggleRow
          label="图表操作按钮"
          checked={chrome.showChartActionButtons}
          onCheckedChange={(checked) => patchChrome({ showChartActionButtons: checked })}
        />
        <DeAttrToggleRow
          label="编辑辅助网格"
          checked={chrome.showAuxiliaryGrid}
          onCheckedChange={(checked) => patchChrome({ showAuxiliaryGrid: checked })}
        />
      </DeAttrToggleSection>
    </DeAttrForm>
  );
}

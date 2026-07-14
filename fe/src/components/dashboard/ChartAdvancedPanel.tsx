import { TimeRangeConfig } from "@/components/charts/TimeRangeConfig";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { useChartInspector } from "./ChartInspectorContext";
import { WidgetAdvancedAccordion } from "./WidgetAdvancedAccordion";

type ChartDeFeatures = {
  dataZoom?: boolean;
  showLabel?: boolean;
};

function readDeFeatures(cfg: ChartViewConfig): ChartDeFeatures {
  const raw = cfg.nativeBody?.deFeatures;
  if (!raw || typeof raw !== "object") return {};
  const f = raw as ChartDeFeatures;
  return { dataZoom: Boolean(f.dataZoom), showLabel: Boolean(f.showLabel) };
}

function patchDeFeatures(cfg: ChartViewConfig, patch: Partial<ChartDeFeatures>): ChartViewConfig {
  const prev = readDeFeatures(cfg);
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deFeatures: { ...prev, ...patch },
    },
  };
}

function ChartFeatureSettings() {
  const { cfg, onChange, columns } = useChartInspector();
  const features = readDeFeatures(cfg);
  const columnsDisabled = columns.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-theme-xs text-gray-700 dark:text-gray-300">缩略轴</Label>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">折线/柱图底部缩放条</p>
        </div>
        <Switch
          checked={features.dataZoom ?? false}
          onCheckedChange={(checked) => onChange(patchDeFeatures(cfg, { dataZoom: checked }))}
          aria-label="缩略轴"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-theme-xs text-gray-700 dark:text-gray-300">显示数据标签</Label>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">在图形上展示数值</p>
        </div>
        <Switch
          checked={features.showLabel ?? false}
          onCheckedChange={(checked) => onChange(patchDeFeatures(cfg, { showLabel: checked }))}
          aria-label="显示数据标签"
        />
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">时间范围</p>
        <div className="mt-2">
          <TimeRangeConfig
            value={cfg.timeRange}
            columns={columns}
            disabled={columnsDisabled}
            onChange={(timeRange) => onChange({ ...cfg, timeRange })}
          />
        </div>
      </div>
    </div>
  );
}

type ChartAdvancedPanelProps = {
  onOpenLinkage?: () => void;
};

/** DataEase chart-edit「高级」Tab：功能设置 / 辅助线 / 条件样式 / 联动 / 跳转 */
export function ChartAdvancedPanel({ onOpenLinkage }: ChartAdvancedPanelProps) {
  return (
    <WidgetAdvancedAccordion
      sections={[
        {
          id: "feature",
          title: "功能设置",
          defaultOpen: true,
          content: <ChartFeatureSettings />,
        },
        {
          id: "guide",
          title: "辅助线",
          disabled: true,
          content: <p className="leading-relaxed">当前版本暂不支持图表辅助线。</p>,
        },
        {
          id: "conditional",
          title: "条件样式",
          disabled: true,
          content: <p className="leading-relaxed">条件样式将在后续版本提供。</p>,
        },
        {
          id: "linkage",
          title: "联动设置",
          content: (
            <div className="space-y-2">
              <p className="leading-relaxed">配置本图作为筛选源或联动目标。</p>
              {onOpenLinkage ? (
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={onOpenLinkage}>
                  打开筛选联动
                </Button>
              ) : null}
            </div>
          ),
        },
        {
          id: "jump",
          title: "跳转设置",
          disabled: true,
          content: <p className="leading-relaxed">外链跳转与下钻将在后续版本提供。</p>,
        },
      ]}
    />
  );
}

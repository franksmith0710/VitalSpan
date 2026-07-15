import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorField } from "@/components/ui/color-field";
import { CHART_PALETTE_PRESETS } from "@/lib/chartPalette";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { formatMetricValue } from "./dashboardStyleConfig";
import { DashboardConfigSection } from "./DashboardConfigSection";
import { ChartTableStylePanel } from "./ChartTableStylePanel";
import { useChartInspector } from "./ChartInspectorContext";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT,
  InspectorFieldRow,
  InspectorSwitchRow,
} from "./inspectorCompact";
import {
  patchChartDeStyle,
  patchChartDeStyleNested,
  patchChartShowLabel,
  readChartDeStyle,
  readChartShowLabel,
} from "@/lib/chartDeStyle";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";
import { useEffect, useState } from "react";

const LEGEND_POSITIONS = [
  { value: "top", label: "上" },
  { value: "bottom", label: "下" },
  { value: "left", label: "左" },
  { value: "right", label: "右" },
] as const;

const BORDER_STYLES = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "dotted", label: "点线" },
] as const;

/** DataEase chart-edit「样式」Tab */
export function ChartStylePanel() {
  const { widget, cfg, onChange, onTitleChange, catalog } = useChartInspector();
  const [localCatalog, setLocalCatalog] = useState<ChartTypeCatalogItem[]>(catalog);

  useEffect(() => {
    if (catalog.length > 0) return;
    fetchChartTypeCatalog().then(setLocalCatalog).catch(() => setLocalCatalog([]));
  }, [catalog]);

  const spec = (catalog.length ? catalog : localCatalog).find((c) => c.type === cfg.chartType);
  const styleVariants = spec?.styleVariants ?? ["default"];
  const deStyle = readChartDeStyle(cfg);
  const showLabel = readChartShowLabel(cfg);
  const isTable = cfg.chartType === "table";
  const caps = chartInspectorCapabilities(cfg.chartType);

  const patchTitle = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "title", patch));
  const patchLegend = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "legend", patch));
  const patchLabel = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "label", patch));
  const patchBackground = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "background", patch));
  const patchBorder = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "border", patch));
  const patchRemark = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "remark", patch));

  return (
    <div className="-mx-3 -mt-3 flex flex-col">
      {isTable ? <ChartTableStylePanel /> : null}

      {!isTable ? (
        <>
          <DashboardConfigSection title="基础样式" defaultOpen compact disabled={!caps.styleVariant}>
            <InspectorFieldRow label="样式子类型">
              <Select
                value={cfg.styleVariant ?? "default"}
                onValueChange={(v) => onChange({ ...cfg, styleVariant: v })}
              >
                <SelectTrigger className={INSPECTOR_SELECT} aria-label="样式子类型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styleVariants.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InspectorFieldRow>
          </DashboardConfigSection>

          <DashboardConfigSection title="配色方案" defaultOpen compact>
            <InspectorFieldRow label="图表配色">
              <Select
                value={deStyle.paletteId ?? "inherit"}
                onValueChange={(paletteId) =>
                  onChange(
                    patchChartDeStyle(cfg, {
                      paletteId: paletteId === "inherit" ? undefined : paletteId,
                    }),
                  )
                }
              >
                <SelectTrigger className={INSPECTOR_SELECT} aria-label="配色方案">
                  <SelectValue placeholder="跟随看板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">跟随看板</SelectItem>
                  {Object.entries(CHART_PALETTE_PRESETS).map(([id]) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InspectorFieldRow>
            <InspectorFieldRow label="配色不透明度 (%)">
              <Input
                type="number"
                min={0}
                max={100}
                className={INSPECTOR_CTRL}
                placeholder="100"
                value={
                  deStyle.paletteOpacity != null ? Math.round(deStyle.paletteOpacity * 100) : ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(
                    patchChartDeStyle(cfg, {
                      paletteOpacity: raw
                        ? Math.min(1, Math.max(0, Number(raw) / 100))
                        : undefined,
                    }),
                  );
                }}
              />
            </InspectorFieldRow>
          </DashboardConfigSection>
        </>
      ) : null}

      <DashboardConfigSection title="标题" defaultOpen compact>
        <div className={INSPECTOR_SECTION_GAP}>
          <InspectorSwitchRow
            label="显示标题"
            checked={deStyle.title?.show !== false}
            onCheckedChange={(show) => patchTitle({ show })}
          />
          <InspectorFieldRow label="文本">
            <Input
              className={INSPECTOR_CTRL}
              value={widget.title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              aria-label="标题文本"
            />
          </InspectorFieldRow>
          <div className="grid grid-cols-2 gap-2">
            <InspectorFieldRow label="字号">
              <Input
                type="number"
                min={10}
                max={48}
                className={INSPECTOR_CTRL}
                value={deStyle.title?.fontSize ?? ""}
                placeholder="18"
                onChange={(e) =>
                  patchTitle({ fontSize: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </InspectorFieldRow>
            <InspectorFieldRow label="颜色">
              <ColorField
                compact
                value={deStyle.title?.color ?? ""}
                onChange={(color) => patchTitle({ color: color || undefined })}
              />
            </InspectorFieldRow>
          </div>
          <InspectorFieldRow label="对齐">
            <Select
              value={deStyle.title?.align ?? "left"}
              onValueChange={(align) => patchTitle({ align: align as "left" | "center" | "right" })}
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">左</SelectItem>
                <SelectItem value="center">中</SelectItem>
                <SelectItem value="right">右</SelectItem>
              </SelectContent>
            </Select>
          </InspectorFieldRow>
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="备注" defaultOpen={false} compact disabled={!caps.remark}>
        <div className={INSPECTOR_SECTION_GAP}>
          <InspectorSwitchRow
            label="显示备注"
            checked={deStyle.remark?.show ?? false}
            onCheckedChange={(show) => patchRemark({ show })}
          />
          <InspectorFieldRow label="备注内容">
            <Input
              className={INSPECTOR_CTRL}
              value={deStyle.remark?.text ?? ""}
              placeholder="图表说明…"
              onChange={(e) => patchRemark({ text: e.target.value })}
            />
          </InspectorFieldRow>
        </div>
      </DashboardConfigSection>

      {!isTable ? (
        <>
          <DashboardConfigSection title="图例" defaultOpen compact disabled={!caps.legend}>
            <div className={INSPECTOR_SECTION_GAP}>
              <InspectorSwitchRow
                label="显示图例"
                checked={deStyle.legend?.show !== false}
                onCheckedChange={(show) => patchLegend({ show })}
              />
              <div className="grid grid-cols-2 gap-2">
                <InspectorFieldRow label="字号">
                  <Input
                    type="number"
                    min={10}
                    max={24}
                    className={INSPECTOR_CTRL}
                    value={deStyle.legend?.fontSize ?? ""}
                    placeholder="12"
                    onChange={(e) =>
                      patchLegend({ fontSize: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </InspectorFieldRow>
                <InspectorFieldRow label="位置">
                  <Select
                    value={deStyle.legend?.position ?? "bottom"}
                    onValueChange={(position) =>
                      patchLegend({ position: position as "top" | "bottom" | "left" | "right" })
                    }
                  >
                    <SelectTrigger className={INSPECTOR_SELECT}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGEND_POSITIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InspectorFieldRow>
              </div>
            </div>
          </DashboardConfigSection>

          <DashboardConfigSection title="标签" defaultOpen compact disabled={!caps.label}>
            <div className={INSPECTOR_SECTION_GAP}>
              <InspectorSwitchRow
                label="显示数据标签"
                checked={showLabel}
                onCheckedChange={(show) => onChange(patchChartShowLabel(cfg, show))}
              />
              <InspectorFieldRow label="字号">
                <Input
                  type="number"
                  min={10}
                  max={24}
                  className={INSPECTOR_CTRL}
                  value={deStyle.label?.fontSize ?? ""}
                  placeholder="12"
                  onChange={(e) =>
                    patchLabel({ fontSize: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </InspectorFieldRow>
              {!caps.labelFormat ? (
                <p className="text-[10px] text-gray-400">当前图表类型不支持标签数值格式</p>
              ) : (
                <p className="text-[10px] text-gray-400">作用于柱/线图数据标签与 tooltip</p>
              )}
              <InspectorFieldRow label="格式类型">
                <Select
                  value={deStyle.label?.formatType ?? "auto"}
                  disabled={!caps.labelFormat}
                  onValueChange={(formatType) =>
                    patchLabel({ formatType: formatType as "auto" | "number" | "percent" | "currency" })
                  }
                >
                  <SelectTrigger className={INSPECTOR_SELECT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">自动</SelectItem>
                    <SelectItem value="number">数值</SelectItem>
                    <SelectItem value="percent">百分比</SelectItem>
                    <SelectItem value="currency">货币</SelectItem>
                  </SelectContent>
                </Select>
              </InspectorFieldRow>
              <label className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                <Checkbox
                  checked={deStyle.label?.thousandSeparator !== false}
                  onCheckedChange={(checked) => patchLabel({ thousandSeparator: checked === true })}
                />
                千分符
              </label>
              <p className="text-[10px] text-gray-400">
                示例：
                {formatMetricValue(1234567.89, {
                  type: deStyle.label?.formatType ?? "auto",
                  decimals: 2,
                  thousandSeparator: deStyle.label?.thousandSeparator !== false,
                })}
              </p>
            </div>
          </DashboardConfigSection>
        </>
      ) : null}

      {!isTable ? (
        <DashboardConfigSection title="背景" defaultOpen={false} compact>
          <div className={INSPECTOR_SECTION_GAP}>
            <InspectorFieldRow label="背景色">
              <ColorField
                compact
                value={deStyle.background?.background ?? ""}
                onChange={(background) => patchBackground({ background: background || undefined })}
              />
            </InspectorFieldRow>
            <div className="grid grid-cols-2 gap-2">
              <InspectorFieldRow label="内边距">
                <Input
                  type="number"
                  min={0}
                  max={48}
                  className={INSPECTOR_CTRL}
                  value={deStyle.background?.padding ?? ""}
                  placeholder="8"
                  onChange={(e) =>
                    patchBackground({ padding: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </InspectorFieldRow>
              <InspectorFieldRow label="圆角">
                <Input
                  type="number"
                  min={0}
                  max={32}
                  className={INSPECTOR_CTRL}
                  value={deStyle.background?.borderRadius ?? ""}
                  placeholder="8"
                  onChange={(e) =>
                    patchBackground({
                      borderRadius: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </InspectorFieldRow>
            </div>
          </div>
        </DashboardConfigSection>
      ) : null}

      {!isTable ? (
        <DashboardConfigSection title="边框" defaultOpen={false} compact>
          <div className={INSPECTOR_SECTION_GAP}>
            <InspectorSwitchRow
              label="显示边框"
              checked={deStyle.border?.show ?? false}
              onCheckedChange={(show) => patchBorder({ show })}
            />
            <InspectorFieldRow label="颜色">
              <ColorField
                compact
                value={deStyle.border?.color ?? ""}
                onChange={(color) => patchBorder({ color: color || undefined })}
              />
            </InspectorFieldRow>
            <div className="grid grid-cols-2 gap-2">
              <InspectorFieldRow label="线宽">
                <Input
                  type="number"
                  min={0}
                  max={8}
                  className={INSPECTOR_CTRL}
                  value={deStyle.border?.width ?? ""}
                  placeholder="1"
                  onChange={(e) =>
                    patchBorder({ width: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </InspectorFieldRow>
              <InspectorFieldRow label="样式">
                <Select
                  value={deStyle.border?.style ?? "solid"}
                  onValueChange={(style) =>
                    patchBorder({ style: style as "solid" | "dashed" | "dotted" })
                  }
                >
                  <SelectTrigger className={INSPECTOR_SELECT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDER_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InspectorFieldRow>
            </div>
          </div>
        </DashboardConfigSection>
      ) : null}
    </div>
  );
}

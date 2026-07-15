import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorField } from "@/components/ui/color-field";
import { WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
import { DashboardConfigSection } from "./DashboardConfigSection";
import { ChartDeAttrField, ChartDeSegmentField } from "./chartInspectorDeFields";
import { ChartDeSliderField } from "./deAttrSlider";
import { DeAttrToggleRow } from "./dashboardInspectorUi";
import { INSPECTOR_SELECT } from "./inspectorCompact";
import { useChartInspector } from "./ChartInspectorContext";
import {
  patchChartDeTableStyle,
  readChartDeTableStyle,
  DEFAULT_TABLE_PAGE_SIZE,
} from "@/lib/chartDeTableStyle";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/** DataEase 明细表 · 样式 Tab「基础样式」折叠（单块，字段顺序对齐 DE） */
export function ChartTableStylePanel() {
  const { cfg, onChange, columns } = useChartInspector();
  const tableStyle = readChartDeTableStyle(cfg);
  const paginationMode = tableStyle.paginationMode ?? "page";
  const columnWidthMode = tableStyle.columnWidthMode ?? "auto";

  const patch = (next: Parameters<typeof patchChartDeTableStyle>[1]) =>
    onChange(patchChartDeTableStyle(cfg, next));

  const displayCols =
    columns.length > 0
      ? columns
      : (cfg.dimensions ?? []).map((d) => d.field).filter(Boolean);

  const patchColumnWidth = (col: string, pct: number) => {
    const prev = tableStyle.columnWidths ?? {};
    patch({ columnWidths: { ...prev, [col]: Math.min(100, Math.max(1, pct)) } });
  };

  return (
    <DashboardConfigSection title="基础样式" defaultOpen compact data-testid="table-style-basic">
      <div className="pb-1">
        <ChartDeSliderField
          label="不透明度 %"
          value={tableStyle.opacity}
          fallback={100}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(opacity) => patch({ opacity })}
        />

        <ChartDeAttrField label="边框颜色">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.borderColor ?? ""}
            onChange={(borderColor) => patch({ borderColor: borderColor || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="滚动条颜色">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.scrollbarColor ?? ""}
            onChange={(scrollbarColor) => patch({ scrollbarColor: scrollbarColor || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeSegmentField
          label="分页模式"
          value={paginationMode}
          columns={2}
          options={[
            { value: "page", label: "翻页" },
            { value: "scroll", label: "下拉" },
          ]}
          onChange={(value) => patch({ paginationMode: value as "page" | "scroll" })}
        />

        {paginationMode === "page" ? (
          <>
            <ChartDeSegmentField
              label="分页器风格"
              value={tableStyle.paginationVariant ?? "compact"}
              columns={2}
              options={[
                { value: "compact", label: "精简" },
                { value: "normal", label: "常规" },
              ]}
              onChange={(value) =>
                patch({ paginationVariant: value as "compact" | "normal" })
              }
            />

            <ChartDeAttrField label="分页">
              <Select
                value={String(tableStyle.pageSize ?? DEFAULT_TABLE_PAGE_SIZE)}
                onValueChange={(value) =>
                  patch({ pageSize: Number(value) as 20 | 50 | 100 })
                }
              >
                <SelectTrigger className={INSPECTOR_SELECT} aria-label="每页条数">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}条/页
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ChartDeAttrField>
          </>
        ) : null}

        <ChartDeSegmentField
          label="列宽调整"
          value={columnWidthMode}
          columns={3}
          options={[
            { value: "auto", label: "自适应" },
            { value: "fixed", label: "固定列宽" },
            { value: "custom", label: "自定义" },
          ]}
          onChange={(value) =>
            patch({ columnWidthMode: value as "auto" | "fixed" | "custom" })
          }
        />

        {columnWidthMode === "custom" && displayCols.length > 0 ? (
          <ChartDeAttrField label="列宽比例 %">
            <div className="space-y-2">
              {displayCols.map((col) => (
                <ChartDeSliderField
                  key={col}
                  className="border-b-0 py-0 last:border-b-0"
                  label={col}
                  value={tableStyle.columnWidths?.[col]}
                  fallback={Math.floor(100 / displayCols.length)}
                  min={1}
                  max={100}
                  step={1}
                  unit="%"
                  ariaLabel={`${col} 列宽`}
                  onChange={(pct) => patchColumnWidth(col, pct)}
                />
              ))}
            </div>
          </ChartDeAttrField>
        ) : null}

        <DeAttrToggleRow
          label="显示鼠标悬浮样式"
          checked={tableStyle.rowHover !== false}
          onCheckedChange={(rowHover) => patch({ rowHover })}
        />
      </div>
    </DashboardConfigSection>
  );
}

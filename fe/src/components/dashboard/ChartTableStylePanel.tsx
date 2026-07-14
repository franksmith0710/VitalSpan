import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorField } from "@/components/ui/color-field";
import { DashboardConfigSection } from "./DashboardConfigSection";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT,
  InspectorFieldRow,
  InspectorSwitchRow,
} from "./inspectorCompact";
import { useChartInspector } from "./ChartInspectorContext";
import { patchChartDeTableStyle, readChartDeTableStyle } from "@/lib/chartDeTableStyle";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/** DataEase 明细表样式：分页 / 列宽 / 滚动条 / 行交互 */
export function ChartTableStylePanel() {
  const { cfg, onChange } = useChartInspector();
  const tableStyle = readChartDeTableStyle(cfg);

  const patch = (next: Parameters<typeof patchChartDeTableStyle>[1]) =>
    onChange(patchChartDeTableStyle(cfg, next));

  return (
    <>
      <DashboardConfigSection title="基础样式" defaultOpen compact>
        <div className={INSPECTOR_SECTION_GAP}>
          <InspectorFieldRow label="不透明度 %">
            <Input
              type="number"
              min={0}
              max={100}
              className={INSPECTOR_CTRL}
              value={tableStyle.opacity ?? ""}
              placeholder="100"
              onChange={(e) =>
                patch({
                  opacity: e.target.value ? Math.min(100, Math.max(0, Number(e.target.value))) : undefined,
                })
              }
            />
          </InspectorFieldRow>
          <InspectorFieldRow label="边框颜色">
            <ColorField
              compact
              value={tableStyle.borderColor ?? ""}
              onChange={(borderColor) => patch({ borderColor: borderColor || undefined })}
            />
          </InspectorFieldRow>
          <InspectorFieldRow label="滚动条颜色">
            <ColorField
              compact
              value={tableStyle.scrollbarColor ?? ""}
              onChange={(scrollbarColor) => patch({ scrollbarColor: scrollbarColor || undefined })}
            />
          </InspectorFieldRow>
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="分页" defaultOpen compact>
        <div className={INSPECTOR_SECTION_GAP}>
          <InspectorFieldRow label="分页模式">
            <Select
              value={tableStyle.paginationMode ?? "page"}
              onValueChange={(value) =>
                patch({ paginationMode: value as "page" | "scroll" })
              }
            >
              <SelectTrigger className={INSPECTOR_SELECT} aria-label="分页模式">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">翻页</SelectItem>
                <SelectItem value="scroll">滚动（不分页）</SelectItem>
              </SelectContent>
            </Select>
          </InspectorFieldRow>
          {(tableStyle.paginationMode ?? "page") === "page" ? (
            <>
              <InspectorFieldRow label="分页器风格">
                <Select
                  value={tableStyle.paginationVariant ?? "compact"}
                  onValueChange={(value) =>
                    patch({ paginationVariant: value as "compact" | "normal" })
                  }
                >
                  <SelectTrigger className={INSPECTOR_SELECT} aria-label="分页器风格">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">精简</SelectItem>
                    <SelectItem value="normal">常规</SelectItem>
                  </SelectContent>
                </Select>
              </InspectorFieldRow>
              <InspectorFieldRow label="每页条数">
                <Select
                  value={String(tableStyle.pageSize ?? 50)}
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
                        {n} 条/页
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InspectorFieldRow>
            </>
          ) : null}
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="表格" defaultOpen compact>
        <div className={INSPECTOR_SECTION_GAP}>
          <InspectorFieldRow label="列宽调整">
            <Select
              value={tableStyle.columnWidthMode ?? "auto"}
              onValueChange={(value) =>
                patch({ columnWidthMode: value as "auto" | "fixed" })
              }
            >
              <SelectTrigger className={INSPECTOR_SELECT} aria-label="列宽调整">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自适应（等分）</SelectItem>
                <SelectItem value="fixed">固定列宽</SelectItem>
              </SelectContent>
            </Select>
          </InspectorFieldRow>
          <InspectorSwitchRow
            label="自动换行"
            checked={tableStyle.wordWrap ?? false}
            onCheckedChange={(wordWrap) => patch({ wordWrap })}
          />
          <InspectorSwitchRow
            label="行悬浮高亮"
            checked={tableStyle.rowHover !== false}
            onCheckedChange={(rowHover) => patch({ rowHover })}
          />
        </div>
      </DashboardConfigSection>
    </>
  );
}

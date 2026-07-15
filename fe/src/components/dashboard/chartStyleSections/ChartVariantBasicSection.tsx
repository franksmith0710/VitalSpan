import { useEffect, useState } from "react";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { styleVariantLabel } from "@/lib/chartStyleSectionRegistry";
import {
  DEFAULT_PIE_INNER_RADIUS_PERCENT,
  patchChartDeStyleNested,
  PIE_INNER_RADIUS_MAX,
  PIE_INNER_RADIUS_MIN,
  readChartDeStyle,
  readChartPieStyle,
} from "@/lib/chartDeStyle";
import { DashboardConfigSection } from "../DashboardConfigSection";
import { ChartDeSegmentField } from "../chartInspectorDeFields";
import { ChartDeSliderField } from "../deAttrSlider";
import { INSPECTOR_SELECT } from "../inspectorCompact";
import { useChartInspector } from "../ChartInspectorContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** 折线/柱/饼：基础样式（子类型），对标 DE 第一段折叠 */
export function ChartVariantBasicSection() {
  const { cfg, onChange, catalog } = useChartInspector();
  const [localCatalog, setLocalCatalog] = useState<ChartTypeCatalogItem[]>(catalog);

  useEffect(() => {
    if (catalog.length > 0) return;
    fetchChartTypeCatalog().then(setLocalCatalog).catch(() => setLocalCatalog([]));
  }, [catalog]);

  const spec = (catalog.length ? catalog : localCatalog).find((c) => c.type === cfg.chartType);
  const variants = spec?.styleVariants ?? ["default"];
  const current = cfg.styleVariant ?? "default";
  const pieStyle = readChartPieStyle(readChartDeStyle(cfg));
  const isPieDonut = cfg.chartType === "pie" && current === "donut";

  if (variants.length <= 1) return null;

  const options = variants.map((v) => ({ value: v, label: styleVariantLabel(v) }));

  return (
    <DashboardConfigSection title="基础样式" defaultOpen compact data-testid="chart-variant-basic">
      {options.length <= 4 ? (
        <ChartDeSegmentField
          label={cfg.chartType === "pie" ? "饼图类型" : "图表类型"}
          value={current}
          columns={Math.min(options.length, 4)}
          options={options}
          onChange={(v) => onChange({ ...cfg, styleVariant: v })}
        />
      ) : (
        <div className="border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">图表类型</p>
          <Select value={current} onValueChange={(v) => onChange({ ...cfg, styleVariant: v })}>
            <SelectTrigger className={INSPECTOR_SELECT} aria-label="图表类型">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isPieDonut ? (
        <ChartDeSliderField
          label="内径 %"
          value={pieStyle.innerRadiusPercent}
          fallback={DEFAULT_PIE_INNER_RADIUS_PERCENT}
          min={PIE_INNER_RADIUS_MIN}
          max={PIE_INNER_RADIUS_MAX}
          step={1}
          unit="%"
          onChange={(innerRadiusPercent) =>
            onChange(patchChartDeStyleNested(cfg, "pie", { innerRadiusPercent }))
          }
        />
      ) : null}
    </DashboardConfigSection>
  );
}

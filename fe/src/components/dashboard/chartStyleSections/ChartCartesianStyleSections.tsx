import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useChartInspector } from "../ChartInspectorContext";
import { DashboardConfigSection } from "../DashboardConfigSection";
import { ChartDeSliderField } from "../deAttrSlider";
import { InspectorSwitchRow, INSPECTOR_SECTION_GAP } from "../inspectorCompact";
import { patchChartDeStyleNested, readChartDeStyle } from "@/lib/chartDeStyle";
import { resolveChartTypeStyleProfile } from "@/lib/chartTypeStyleProfiles";
import { resolveCartesianShapeFields } from "@/lib/chartStyleCartesianFields";
import { DEFAULT_CARTESIAN_BAR_WIDTH_RATIO, DEFAULT_CARTESIAN_POINT_SIZE } from "@/lib/chartDeStyleBlocks";

export function ChartAxisStyleSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const axis = readChartDeStyle(cfg).axis ?? {};

  const patchAxis = (side: "x" | "y", patch: Record<string, unknown>) =>
    mutateChartConfig((current) =>
      patchChartDeStyleNested(current, "axis", { [side]: { ...axis[side], ...patch } }),
    );

  return (
    <DashboardConfigSection title="坐标轴" compact data-testid="chart-axis-style">
      <div className={INSPECTOR_SECTION_GAP}>
        {(["x", "y"] as const).map((side) => (
          <div key={side} className="border-b border-gray-100 py-2 dark:border-white/[0.06]">
            <p className="mb-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
              {side === "x" ? "横轴" : "纵轴"}
            </p>
            <InspectorSwitchRow
              label="显示轴线"
              checked={axis[side]?.show !== false}
              onCheckedChange={(show) => patchAxis(side, { show })}
            />
            <div className="mt-2">
              <p className="mb-1 text-[11px] text-gray-500">轴名称</p>
              <Input
                className="h-8 text-xs"
                value={axis[side]?.name ?? ""}
                onChange={(e) => patchAxis(side, { name: e.target.value || undefined })}
                placeholder={side === "x" ? "类别轴" : "数值轴"}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardConfigSection>
  );
}

export function ChartCartesianShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const profileFields = resolveChartTypeStyleProfile(cfg.chartType).fields?.cartesianShape;
  const fields = profileFields ?? resolveCartesianShapeFields(cfg.chartType);
  const cartesian = readChartDeStyle(cfg).cartesian ?? {};

  const patch = (next: Record<string, unknown>) =>
    mutateChartConfig((current) => patchChartDeStyleNested(current, "cartesian", next));

  const patchLineSmooth = (lineSmooth: boolean) =>
    mutateChartConfig((current) => {
      let next = patchChartDeStyleNested(current, "cartesian", { lineSmooth });
      if (current.chartType === "line") {
        next = {
          ...next,
          styleVariant: lineSmooth
            ? "smooth"
            : next.styleVariant === "smooth"
              ? "default"
              : next.styleVariant,
        };
      }
      return next;
    });

  if (!fields?.length) return null;

  return (
    <DashboardConfigSection title="图形属性" compact data-testid="chart-cartesian-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        {fields.includes("barWidthRatio") ? (
          <ChartDeSliderField
            label="柱宽比例"
            value={cartesian.barWidthRatio}
            fallback={DEFAULT_CARTESIAN_BAR_WIDTH_RATIO}
            min={0.2}
            max={0.9}
            step={0.05}
            onChange={(barWidthRatio) => patch({ barWidthRatio })}
          />
        ) : null}
        {fields.includes("barRadius") ? (
          <ChartDeSliderField
            label="圆角"
            value={cartesian.barRadius}
            fallback={0}
            min={0}
            max={12}
            step={1}
            onChange={(barRadius) => patch({ barRadius })}
          />
        ) : null}
        {fields.includes("lineSmooth") ? (
          <InspectorSwitchRow
            label="平滑曲线"
            checked={cartesian.lineSmooth === true}
            onCheckedChange={patchLineSmooth}
          />
        ) : null}
        {fields.includes("pointSize") ? (
          <ChartDeSliderField
            label="点大小"
            value={cartesian.pointSize}
            fallback={DEFAULT_CARTESIAN_POINT_SIZE}
            min={2}
            max={12}
            step={1}
            onChange={(pointSize) => patch({ pointSize })}
          />
        ) : null}
        {fields.includes("areaOpacity") ? (
          <ChartDeSliderField
            label="面积透明度"
            value={cartesian.areaOpacity}
            fallback={0.35}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(areaOpacity) => patch({ areaOpacity })}
          />
        ) : null}
      </div>
    </DashboardConfigSection>
  );
}

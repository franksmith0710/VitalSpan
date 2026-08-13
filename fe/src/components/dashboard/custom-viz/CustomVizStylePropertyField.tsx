import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEXT_COLOR_RECOMMENDED } from "@/components/dashboard/dashboardStyleConfig";
import { ChartDeAttrField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { ChartDeSliderField } from "../deAttrSlider";
import { INSPECTOR_HINT, INSPECTOR_SELECT_TRIGGER, InspectorInlineColorRow, InspectorSwitchRow } from "../inspectorCompact";
import type { StyleProperty } from "./customVizStyleSchema";
import { resolveCustomVizStylePropertyLabel } from "./customVizManifestLabels";

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

type CustomVizStylePropertyFieldProps = {
  propKey: string;
  prop: StyleProperty;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export function CustomVizStylePropertyField({
  propKey,
  prop,
  value,
  onChange,
}: CustomVizStylePropertyFieldProps) {
  const label = resolveCustomVizStylePropertyLabel(propKey, prop.title);
  const current = value[propKey];
  const hint = prop.description?.trim();

  const hintNode = hint ? <p className={INSPECTOR_HINT}>{hint}</p> : null;

  if (prop.type === "boolean") {
    return (
      <div className="border-b border-gray-100 py-2 last:border-b-0 dark:border-white/[0.06]">
        <InspectorSwitchRow
          label={label}
          checked={readBoolean(current, false)}
          onCheckedChange={(checked) => onChange({ ...value, [propKey]: checked })}
        />
        {hintNode}
      </div>
    );
  }

  if (prop.format === "color" || (prop.type === "string" && prop.format === "color")) {
    const color = typeof current === "string" && current ? current : "#2563eb";
    return (
      <div>
        <InspectorInlineColorRow
          label={label}
          value={color}
          swatches={TEXT_COLOR_RECOMMENDED}
          allowClear={false}
          fallbackValue="#2563eb"
          onChange={(next) => onChange({ ...value, [propKey]: next ?? "#2563eb" })}
        />
        {hintNode}
      </div>
    );
  }

  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    const selected = typeof current === "string" ? current : prop.enum[0];
    return (
      <ChartDeAttrField label={label}>
        <Select
          value={selected}
          onValueChange={(next) => onChange({ ...value, [propKey]: next })}
        >
          <SelectTrigger className={INSPECTOR_SELECT_TRIGGER} aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {prop.enum.map((option, index) => (
              <SelectItem key={option} value={option}>
                {prop.enumNames?.[index] ?? option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hintNode}
      </ChartDeAttrField>
    );
  }

  if (prop.type === "number") {
    const isOpacity = prop.format === "opacity";
    const min = typeof prop.minimum === "number" ? prop.minimum : isOpacity ? 0 : 0;
    const max = typeof prop.maximum === "number" ? prop.maximum : isOpacity ? 100 : 100;
    const step = typeof prop.step === "number" ? prop.step : isOpacity ? 1 : 1;
    const fallback = readNumber(current, min);
    return (
      <div>
        <ChartDeSliderField
          label={label}
          value={readNumber(current, fallback)}
          fallback={fallback}
          min={min}
          max={max}
          step={step}
          unit={isOpacity ? "%" : undefined}
          layout="stacked"
          onChange={(next) => onChange({ ...value, [propKey]: next })}
        />
        {hintNode}
      </div>
    );
  }

  return (
    <ChartDeAttrField label={label}>
      <Input
        className={CHART_DE_INPUT}
        value={current != null ? String(current) : ""}
        onChange={(e) => onChange({ ...value, [propKey]: e.target.value })}
      />
      {hintNode}
    </ChartDeAttrField>
  );
}

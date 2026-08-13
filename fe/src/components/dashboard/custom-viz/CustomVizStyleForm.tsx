import { Input } from "@/components/ui/input";
import { TEXT_COLOR_RECOMMENDED } from "@/components/dashboard/dashboardStyleConfig";
import { ChartDeAttrField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { ChartInspectorSection, InspectorInlineColorRow } from "../inspectorCompact";
import { ChartDeSliderField } from "../deAttrSlider";
import {
  readStyleSchemaProperties,
  type StyleProperty,
} from "./customVizStyleSchema";
import { resolveCustomVizStylePropertyLabel } from "./customVizManifestLabels";

type CustomVizStyleFormProps = {
  styleSchema?: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function StylePropertyField({
  propKey,
  prop,
  value,
  onChange,
}: {
  propKey: string;
  prop: StyleProperty;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const label = resolveCustomVizStylePropertyLabel(propKey, prop.title);
  const current = value[propKey];

  if (prop.format === "color" || (prop.type === "string" && prop.format === "color")) {
    const color = typeof current === "string" && current ? current : "#2563eb";
    return (
      <InspectorInlineColorRow
        label={label}
        value={color}
        swatches={TEXT_COLOR_RECOMMENDED}
        allowClear={false}
        fallbackValue="#2563eb"
        onChange={(next) => onChange({ ...value, [propKey]: next ?? "#2563eb" })}
      />
    );
  }

  if (prop.type === "number") {
    const min = typeof prop.minimum === "number" ? prop.minimum : 0;
    const max = typeof prop.maximum === "number" ? prop.maximum : 100;
    const fallback = readNumber(current, min);
    return (
      <ChartDeSliderField
        label={label}
        value={readNumber(current, fallback)}
        fallback={fallback}
        min={min}
        max={max}
        step={1}
        layout="stacked"
        onChange={(next) => onChange({ ...value, [propKey]: next })}
      />
    );
  }

  return (
    <ChartDeAttrField label={label}>
      <Input
        className={CHART_DE_INPUT}
        value={current != null ? String(current) : ""}
        onChange={(e) => onChange({ ...value, [propKey]: e.target.value })}
      />
    </ChartDeAttrField>
  );
}

export function CustomVizStyleForm({ styleSchema, value, onChange }: CustomVizStyleFormProps) {
  const properties = readStyleSchemaProperties(styleSchema);
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return (
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        该组件未声明可编辑样式（manifest.styleSchema）。
      </p>
    );
  }

  return (
    <ChartInspectorSection title="组件样式" defaultOpen>
      <div className="flex flex-col" data-testid="custom-viz-style-form">
        {entries.map(([key, prop]) => (
          <StylePropertyField
            key={key}
            propKey={key}
            prop={prop}
            value={value}
            onChange={onChange}
          />
        ))}
      </div>
    </ChartInspectorSection>
  );
}

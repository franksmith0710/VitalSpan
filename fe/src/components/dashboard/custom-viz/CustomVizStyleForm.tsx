import { Input } from "@/components/ui/input";
import { DeAttrField, DeAttrForm } from "../dashboardInspectorUi";
import { readStyleSchemaProperties, type StyleProperty } from "./customVizStyleSchema";

type CustomVizStyleFormProps = {
  styleSchema?: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

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
    <DeAttrForm className="space-y-3">
      {entries.map(([key, prop]) => {
        const label = prop.title ?? key;
        const current = value[key];
        if (prop.format === "color" || prop.type === "string") {
          return (
            <DeAttrField key={key} label={label}>
              <Input
                type={prop.format === "color" ? "color" : "text"}
                className="h-8"
                value={typeof current === "string" ? current : ""}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            </DeAttrField>
          );
        }
        if (prop.type === "number") {
          return (
            <DeAttrField key={key} label={label}>
              <Input
                type="number"
                className="h-8"
                min={prop.minimum}
                max={prop.maximum}
                value={typeof current === "number" ? current : ""}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  onChange({ ...value, [key]: Number.isFinite(parsed) ? parsed : undefined });
                }}
              />
            </DeAttrField>
          );
        }
        return (
          <DeAttrField key={key} label={label}>
            <Input
              className="h-8"
              value={current != null ? String(current) : ""}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </DeAttrField>
        );
      })}
    </DeAttrForm>
  );
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeAttrField, DeAttrForm } from "../dashboardInspectorUi";

type StyleProperty = {
  type?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  title?: string;
};

type CustomVizStyleFormProps = {
  styleSchema?: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

function readProperties(schema: Record<string, unknown> | undefined): Record<string, StyleProperty> {
  const props = schema?.properties;
  if (!props || typeof props !== "object") return {};
  return props as Record<string, StyleProperty>;
}

export function CustomVizStyleForm({ styleSchema, value, onChange }: CustomVizStyleFormProps) {
  const properties = readProperties(styleSchema);
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

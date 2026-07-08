import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConnectorTypeItem } from "@/lib/connector-taxonomy";
import {
  CONNECTOR_FIELD_HINTS,
  CONNECTOR_HINT_TEXT,
  showConnectorHint,
} from "./datasource-form-constants";

function TypeHint({ type }: { type: string }) {
  if (!showConnectorHint(type)) return null;
  const id = type === "oceanbase" ? "oceanbase-hint" : type === "gaussdb" ? "gaussdb-hint" : "impala-hint";
  return (
    <p id={id} className="text-theme-sm text-gray-500 dark:text-gray-400">
      {CONNECTOR_HINT_TEXT[type]}
    </p>
  );
}

type Props = {
  mode: "create" | "edit";
  type: string;
  selectedTypeLabel: string;
  typeItems: ConnectorTypeItem[];
  onTypeChange: (type: string) => void;
};

export function DatasourceTypeField({
  mode,
  type,
  selectedTypeLabel,
  typeItems,
  onTypeChange,
}: Props) {
  if (mode === "edit") {
    return (
      <div className="grid gap-2">
        <Label>类型</Label>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            {(typeItems.length ? typeItems : [{ type: "mysql", displayName: "MySQL" }]).map((t) => (
              <SelectItem key={t.type} value={t.type}>
                {t.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TypeHint type={type} />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label>类型</Label>
      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{selectedTypeLabel}</p>
      <TypeHint type={type} />
    </div>
  );
}

export function applyTypePort(type: string, prevPort: string): string {
  return CONNECTOR_FIELD_HINTS[type]?.port ?? prevPort;
}

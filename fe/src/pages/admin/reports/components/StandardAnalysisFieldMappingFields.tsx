import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisPack } from "../useStandardAnalysis";
import { ConfigField, ConfigInset } from "./standardAnalysisConfigUi";

type Props = {
  draft: AnalysisPack;
  columnOptions: string[];
  onChange: (updater: (current: AnalysisPack) => AnalysisPack) => void;
};

function FieldMappingInput({
  id,
  label,
  value,
  columns,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
}) {
  if (columns.length > 0) {
    return (
      <ConfigField id={id} label={label}>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-11">
            <SelectValue placeholder="选择列" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfigField>
    );
  }

  return (
    <ConfigField id={id} label={label}>
      <Input id={id} className="h-11" value={value} onChange={(event) => onChange(event.target.value)} />
    </ConfigField>
  );
}

export function StandardAnalysisFieldMappingFields({ draft, columnOptions, onChange }: Props) {
  return (
    <ConfigInset
      title="字段映射"
      description="将分析主题所需维度映射到数据集或物理表列；活跃度与趋势需配置时间字段。"
    >
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <FieldMappingInput
          id="status"
          label="状态字段"
          value={draft.fieldMapping.status ?? ""}
          columns={columnOptions}
          onChange={(status) =>
            onChange((current) => ({
              ...current,
              fieldMapping: { ...current.fieldMapping, status },
            }))
          }
        />
        <FieldMappingInput
          id="region"
          label="区域字段"
          value={draft.fieldMapping.region ?? ""}
          columns={columnOptions}
          onChange={(region) =>
            onChange((current) => ({
              ...current,
              fieldMapping: { ...current.fieldMapping, region },
            }))
          }
        />
        <FieldMappingInput
          id="createdAt"
          label="时间字段"
          value={draft.fieldMapping.createdAt ?? ""}
          columns={columnOptions}
          onChange={(createdAt) =>
            onChange((current) => ({
              ...current,
              fieldMapping: { ...current.fieldMapping, createdAt },
            }))
          }
        />
      </div>
    </ConfigInset>
  );
}

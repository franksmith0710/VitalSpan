import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateBlock } from "../useReportTemplates";

type Props = {
  block: TemplateBlock;
  readOnly?: boolean;
  onPatch: (patch: Partial<TemplateBlock>) => void;
};

export function CrosstabBlockFields({ block, readOnly = false, onPatch }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label>指标引用（tableRef）</Label>
        <Input
          value={block.tableRef ?? ""}
          onChange={(e) => onPatch({ tableRef: e.target.value })}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-2">
        <Label>行维度字段</Label>
        <Input
          value={block.rowField ?? ""}
          onChange={(e) => onPatch({ rowField: e.target.value })}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-2">
        <Label>列维度字段</Label>
        <Input
          value={block.colField ?? ""}
          onChange={(e) => onPatch({ colField: e.target.value })}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-2">
        <Label>指标字段</Label>
        <Input
          value={block.valueField ?? ""}
          onChange={(e) => onPatch({ valueField: e.target.value })}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-2">
        <Label>聚合方式</Label>
        <Select
          value={block.agg ?? "sum"}
          onValueChange={(v) => onPatch({ agg: v as TemplateBlock["agg"] })}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sum">求和</SelectItem>
            <SelectItem value="count">计数</SelectItem>
            <SelectItem value="max">最大</SelectItem>
            <SelectItem value="min">最小</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

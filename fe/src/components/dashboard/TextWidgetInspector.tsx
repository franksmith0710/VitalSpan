import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";

type TextWidgetInspectorProps = {
  widget: LayoutWidget & { textConfig: TextWidgetConfig };
  onChange: (textConfig: TextWidgetConfig) => void;
  embedded?: boolean;
};

export function TextWidgetInspector({ widget, onChange, embedded = false }: TextWidgetInspectorProps) {
  const cfg = widget.textConfig;
  const patch = (partial: Partial<TextWidgetConfig>) => onChange({ ...cfg, ...partial });

  const body = (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label>格式</Label>
        <Select value={cfg.variant} onValueChange={(v) => patch({ variant: v as TextWidgetConfig["variant"] })}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">纯文本</SelectItem>
            <SelectItem value="markdown">Markdown（简易）</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`tw-content-${widget.id}`}>内容</Label>
        <Textarea
          id={`tw-content-${widget.id}`}
          rows={8}
          value={cfg.content}
          onChange={(e) => patch({ content: e.target.value })}
          placeholder="输入说明文字…"
        />
      </div>
    </div>
  );

  if (embedded) return body;
  return <div className="rounded-xl border border-gray-200 dark:border-gray-800">{body}</div>;
}

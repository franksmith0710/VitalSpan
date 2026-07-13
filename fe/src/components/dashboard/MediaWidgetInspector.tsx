import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LayoutWidget, MediaFit, MediaWidgetConfig } from "./layoutUtils";

type MediaWidgetInspectorProps = {
  widget: LayoutWidget & { mediaConfig: MediaWidgetConfig };
  onChange: (mediaConfig: MediaWidgetConfig) => void;
  embedded?: boolean;
};

export function MediaWidgetInspector({ widget, onChange, embedded = false }: MediaWidgetInspectorProps) {
  const cfg = widget.mediaConfig;
  const patch = (partial: Partial<MediaWidgetConfig>) => onChange({ ...cfg, ...partial });

  const body = (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor={`mw-url-${widget.id}`}>图片 URL</Label>
        <Input
          id={`mw-url-${widget.id}`}
          value={cfg.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`mw-alt-${widget.id}`}>替代文本</Label>
        <Input
          id={`mw-alt-${widget.id}`}
          value={cfg.alt}
          onChange={(e) => patch({ alt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>缩放</Label>
        <Select value={cfg.fit} onValueChange={(v) => patch({ fit: v as MediaFit })}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">包含</SelectItem>
            <SelectItem value="cover">覆盖</SelectItem>
            <SelectItem value="fill">拉伸</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (embedded) return body;
  return <div className="rounded-xl border border-gray-200 dark:border-gray-800">{body}</div>;
}

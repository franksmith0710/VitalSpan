import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorField } from "@/components/ui/color-field";
import type { SpacingMode, WidgetStyleConfig } from "./dashboardStyleConfig";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT,
  InspectorFieldRow,
} from "./inspectorCompact";

type ChartBackgroundStyleFieldsProps = {
  value: WidgetStyleConfig;
  onChange: (patch: Partial<WidgetStyleConfig>) => void;
};

function SpacingModeSelect({
  label,
  mode,
  onChange,
}: {
  label: string;
  mode: SpacingMode;
  onChange: (mode: SpacingMode) => void;
}) {
  return (
    <InspectorFieldRow label={label}>
      <Select value={mode} onValueChange={(v) => onChange(v as SpacingMode)}>
        <SelectTrigger className={INSPECTOR_SELECT} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unified">统一值</SelectItem>
          <SelectItem value="individual">分边</SelectItem>
        </SelectContent>
      </Select>
    </InspectorFieldRow>
  );
}

/** DataEase 样式 Tab · 背景区块（组件级 deStyle.background） */
export function ChartBackgroundStyleFields({ value, onChange }: ChartBackgroundStyleFieldsProps) {
  const ws = value;
  return (
    <div className={INSPECTOR_SECTION_GAP}>
      <InspectorFieldRow label="不透明度">
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          className={INSPECTOR_CTRL}
          placeholder="1"
          value={ws.opacity ?? ""}
          onChange={(e) =>
            onChange({ opacity: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </InspectorFieldRow>
      <InspectorFieldRow label="背景色">
        <ColorField
          compact
          allowClear
          value={ws.background ?? ""}
          onChange={(background) => onChange({ background: background || undefined })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow label="背景图片 URL">
        <Input
          className={INSPECTOR_CTRL}
          placeholder="https://…"
          value={ws.backgroundImage ?? ""}
          onChange={(e) => onChange({ backgroundImage: e.target.value || undefined })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow label="背景模糊 (px)">
        <Input
          type="number"
          min={0}
          max={48}
          className={INSPECTOR_CTRL}
          value={ws.backdropBlur ?? ""}
          placeholder="0"
          onChange={(e) =>
            onChange({ backdropBlur: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </InspectorFieldRow>

      <SpacingModeSelect
        label="内边距模式"
        mode={ws.paddingMode ?? "unified"}
        onChange={(paddingMode) => onChange({ paddingMode })}
      />
      {(ws.paddingMode ?? "unified") === "unified" ? (
        <InspectorFieldRow label="内边距 (px)">
          <Input
            type="number"
            min={0}
            max={64}
            className={INSPECTOR_CTRL}
            value={ws.padding ?? ""}
            placeholder="8"
            onChange={(e) =>
              onChange({ padding: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </InspectorFieldRow>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["paddingTop", "上"],
              ["paddingRight", "右"],
              ["paddingBottom", "下"],
              ["paddingLeft", "左"],
            ] as const
          ).map(([key, label]) => (
            <InspectorFieldRow key={key} label={label}>
              <Input
                type="number"
                min={0}
                max={64}
                className={INSPECTOR_CTRL}
                value={ws[key] ?? ""}
                onChange={(e) =>
                  onChange({ [key]: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </InspectorFieldRow>
          ))}
        </div>
      )}

      <SpacingModeSelect
        label="圆角模式"
        mode={ws.radiusMode ?? "unified"}
        onChange={(radiusMode) => onChange({ radiusMode })}
      />
      {(ws.radiusMode ?? "unified") === "unified" ? (
        <InspectorFieldRow label="圆角 (px)">
          <Input
            type="number"
            min={0}
            max={48}
            className={INSPECTOR_CTRL}
            value={ws.borderRadius ?? ""}
            placeholder="8"
            onChange={(e) =>
              onChange({ borderRadius: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </InspectorFieldRow>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["borderRadiusTopLeft", "左上"],
              ["borderRadiusTopRight", "右上"],
              ["borderRadiusBottomLeft", "左下"],
              ["borderRadiusBottomRight", "右下"],
            ] as const
          ).map(([key, label]) => (
            <InspectorFieldRow key={key} label={label}>
              <Input
                type="number"
                min={0}
                max={48}
                className={INSPECTOR_CTRL}
                value={ws[key] ?? ""}
                onChange={(e) =>
                  onChange({ [key]: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </InspectorFieldRow>
          ))}
        </div>
      )}
    </div>
  );
}

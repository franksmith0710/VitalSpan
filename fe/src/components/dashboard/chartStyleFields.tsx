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
import { InspectorSliderField } from "./deAttrSlider";

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
      <InspectorSliderField
        label="不透明度"
        value={ws.opacity != null ? Math.round(ws.opacity * 100) : undefined}
        fallback={100}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(opacity) => onChange({ opacity: opacity / 100 })}
      />
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
      <InspectorSliderField
        label="背景模糊"
        value={ws.backdropBlur}
        fallback={0}
        min={0}
        max={48}
        step={1}
        unit="px"
        onChange={(backdropBlur) => onChange({ backdropBlur })}
      />

      <SpacingModeSelect
        label="内边距模式"
        mode={ws.paddingMode ?? "unified"}
        onChange={(paddingMode) => onChange({ paddingMode })}
      />
      {(ws.paddingMode ?? "unified") === "unified" ? (
        <InspectorSliderField
          label="内边距"
          value={ws.padding}
          fallback={8}
          min={0}
          max={64}
          step={1}
          unit="px"
          onChange={(padding) => onChange({ padding })}
        />
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
            <InspectorSliderField
              key={key}
              label={label}
              value={ws[key]}
              fallback={8}
              min={0}
              max={64}
              step={1}
              unit="px"
              onChange={(next) => onChange({ [key]: next })}
            />
          ))}
        </div>
      )}

      <SpacingModeSelect
        label="圆角模式"
        mode={ws.radiusMode ?? "unified"}
        onChange={(radiusMode) => onChange({ radiusMode })}
      />
      {(ws.radiusMode ?? "unified") === "unified" ? (
        <InspectorSliderField
          label="圆角"
          value={ws.borderRadius}
          fallback={8}
          min={0}
          max={48}
          step={1}
          unit="px"
          onChange={(borderRadius) => onChange({ borderRadius })}
        />
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
            <InspectorSliderField
              key={key}
              label={label}
              value={ws[key]}
              fallback={8}
              min={0}
              max={48}
              step={1}
              unit="px"
              onChange={(next) => onChange({ [key]: next })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

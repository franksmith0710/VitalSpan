import { Switch } from "@/components/ui/switch";
import { ColorField } from "@/components/ui/color-field";
import { ImageSourceField } from "./imageSourceField";
import type { SpacingMode, WidgetStyleConfig } from "./dashboardStyleConfig";
import { SURFACE_COLOR_RECOMMENDED, WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT,
  InspectorFieldRow,
} from "./inspectorCompact";
import { InspectorSliderField } from "./deAttrSlider";
import { DeAttrSubField, DeSegmentGroup } from "./dashboardInspectorUi";
import { ChartDeSegmentField } from "./chartInspectorDeFields";
import { ChartFramePresetPicker } from "./ChartFramePresetPicker";
import type { ChartBorderStyle } from "@/lib/chartDeStyle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LINE_BORDER_STYLES = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "dotted", label: "点线" },
] as const;

const BG_MODE_OPTIONS = [
  { value: "image", label: "图片" },
  { value: "frame", label: "边框" },
] as const;

type BackgroundPatch = Partial<WidgetStyleConfig>;

/** DataEase 背景区核心：图片 / 装饰边框（对标 attr-style 背景折叠块内容） */
export function ChartBackgroundDeModeFields({
  value,
  onChange,
  disabled = false,
}: {
  value: WidgetStyleConfig;
  onChange: (patch: BackgroundPatch) => void;
  disabled?: boolean;
}) {
  const mode = value.backgroundMode ?? (value.framePresetId ? "frame" : "image");

  if (disabled) {
    return (
      <p className="py-1 text-[11px] text-gray-400 dark:text-gray-500">
        开启背景后可设置图片或装饰边框
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <DeSegmentGroup
        sizing="fit"
        value={mode}
        columns={2}
        options={BG_MODE_OPTIONS}
        onChange={(next) =>
          onChange({
            backgroundMode: next as "image" | "frame",
            backgroundShow: true,
            ...(next === "frame" && !value.framePresetId ? { framePresetId: "frame-1" } : {}),
          })
        }
      />
      {mode === "image" ? (
        <ImageSourceField
          variant="rail"
          inputClassName={INSPECTOR_CTRL}
          value={value.backgroundImage ?? ""}
          onChange={(backgroundImage) =>
            onChange({ backgroundImage, backgroundShow: true, backgroundMode: "image" })
          }
        />
      ) : (
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2">
          <ColorField
            compact
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={value.frameColor ?? ""}
            onChange={(color) =>
              onChange({
                frameColor: color || undefined,
                backgroundShow: true,
                backgroundMode: "frame",
              })
            }
          />
          <ChartFramePresetPicker
            value={value.framePresetId}
            color={value.frameColor}
            onChange={(presetId) =>
              onChange({
                framePresetId: presetId,
                backgroundShow: true,
                backgroundMode: "frame",
              })
            }
          />
        </div>
      )}
    </div>
  );
}

type ChartBackgroundStyleFieldsProps = {
  value: WidgetStyleConfig;
  border?: ChartBorderStyle;
  onChange: (patch: BackgroundPatch) => void;
  onBorderChange?: (patch: Partial<ChartBorderStyle>) => void;
  /** 背景开关在折叠标题栏时设为 false */
  showHeaderToggle?: boolean;
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

/** DataEase 样式 Tab · 背景区块（组件级 deStyle.background + 线框边框） */
export function ChartBackgroundStyleFields({
  value,
  border,
  onChange,
  onBorderChange,
  showHeaderToggle = true,
}: ChartBackgroundStyleFieldsProps) {
  const ws = value;
  const showBackground = ws.backgroundShow !== false;

  return (
    <div className={INSPECTOR_SECTION_GAP}>
      {showHeaderToggle ? (
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-white/[0.06]">
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">启用</span>
          <Switch
            checked={showBackground}
            onCheckedChange={(show) => onChange({ backgroundShow: show })}
            aria-label="背景"
            className="scale-90"
          />
        </div>
      ) : null}

      <ChartBackgroundDeModeFields
        value={ws}
        onChange={onChange}
        disabled={!showBackground}
      />

      <DeAttrSubField label="更多">
        {onBorderChange ? (
          <>
            <DeAttrToggleRowCompact
              label="线框"
              checked={border?.show ?? false}
              onCheckedChange={(show) => onBorderChange({ show })}
            />
            {border?.show ? (
              <div className="space-y-2">
                <InspectorFieldRow label="线框色">
                  <ColorField
                    compact
                    swatches={WIDGET_BORDER_RECOMMENDED}
                    value={border.color ?? ""}
                    onChange={(color) => onBorderChange({ color: color || undefined })}
                  />
                </InspectorFieldRow>
                <div className="grid grid-cols-2 gap-2">
                  <InspectorSliderField
                    label="线宽"
                    value={border.width}
                    fallback={1}
                    min={0}
                    max={8}
                    step={1}
                    unit="px"
                    onChange={(width) => onBorderChange({ width })}
                  />
                  <InspectorSliderField
                    label="圆角"
                    value={border.radius}
                    fallback={0}
                    min={0}
                    max={32}
                    step={1}
                    unit="px"
                    onChange={(radius) => onBorderChange({ radius })}
                  />
                </div>
                <ChartDeSegmentField
                  label="线型"
                  value={border.style ?? "solid"}
                  columns={3}
                  options={LINE_BORDER_STYLES.map((s) => ({ value: s.value, label: s.label }))}
                  onChange={(style) =>
                    onBorderChange({ style: style as ChartBorderStyle["style"] })
                  }
                />
              </div>
            ) : null}
          </>
        ) : null}

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
            swatches={SURFACE_COLOR_RECOMMENDED}
            value={ws.background ?? ""}
            onChange={(background) => onChange({ background: background || undefined })}
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
      </DeAttrSubField>
    </div>
  );
}

function DeAttrToggleRowCompact({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-600 dark:text-gray-300">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="scale-90"
      />
    </div>
  );
}

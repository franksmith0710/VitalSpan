import { Switch } from "@/components/ui/switch";
import { ColorField } from "@/components/ui/color-field";
import { ImageSourceField } from "./imageSourceField";
import type { WidgetStyleConfig } from "./dashboardStyleConfig";
import { SURFACE_COLOR_RECOMMENDED, WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
import {
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  InspectorFieldRow,
  InspectorSwitchRow,
} from "./inspectorCompact";
import { InspectorSliderField } from "./deAttrSlider";
import { DeSegmentGroup } from "./dashboardInspectorUi";
import { ChartDeSegmentField } from "./chartInspectorDeFields";
import { ChartFramePresetPicker } from "./ChartFramePresetPicker";
import type { ChartBorderStyle } from "@/lib/chartDeStyle";
import { InspectorNestedSection } from "./inspectorNestedSection";
import {
  WidgetSurfaceAppearanceFields,
  WidgetSurfaceSpacingFields,
} from "./widgetSurfaceStyleFields";

const LINE_BORDER_STYLES = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "dotted", label: "点线" },
] as const;

const BG_MODE_OPTIONS = [
  { value: "image", label: "图片" },
  { value: "frame", label: "装饰边框" },
] as const;

const BG_MODE_LINE_BORDER_OPTIONS = [
  { value: "image", label: "图片" },
  { value: "border", label: "线框" },
] as const;

type BackgroundPatch = Partial<WidgetStyleConfig>;

type ChartBackgroundDeModeFieldsProps = {
  value: WidgetStyleConfig;
  onChange: (patch: BackgroundPatch) => void;
  disabled?: boolean;
  /** chart：装饰边框 SVG；dashboard 全局：仅底图 + 独立线区块 */
  borderTab?: "decorative" | "line" | "imageOnly";
};

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
    <InspectorSwitchRow
      label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  );
}

export function WidgetStyleLineBorderControls({
  value,
  onChange,
  showToggle = true,
}: {
  value: WidgetStyleConfig;
  onChange: (patch: BackgroundPatch) => void;
  showToggle?: boolean;
}) {
  const lineOn = value.borderEnabled !== false;

  return (
    <div className="space-y-2">
      {showToggle ? (
        <DeAttrToggleRowCompact
          label="显示线框"
          checked={lineOn}
          onCheckedChange={(show) => onChange({ borderEnabled: show, backgroundShow: true })}
        />
      ) : null}
      {lineOn ? (
        <div className="space-y-2">
          <InspectorFieldRow label="线框色">
            <ColorField
              compact
              allowClear
              swatches={WIDGET_BORDER_RECOMMENDED}
              value={value.borderColor ?? ""}
              onChange={(color) => onChange({ borderColor: color || undefined })}
            />
          </InspectorFieldRow>
          <InspectorSliderField
            label="线宽"
            value={value.borderWidth}
            fallback={1}
            min={0}
            max={8}
            step={1}
            unit="px"
            onChange={(borderWidth) => onChange({ borderWidth })}
          />
          <ChartDeSegmentField
            label="线型"
            value={value.borderStyle ?? "solid"}
            columns={3}
            options={LINE_BORDER_STYLES.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(style) =>
              onChange({ borderStyle: style as WidgetStyleConfig["borderStyle"] })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

/** DataEase 背景区核心：图片 / 边框（装饰 SVG 或 CSS 线框） */
export function ChartBackgroundDeModeFields({
  value,
  onChange,
  disabled = false,
  borderTab = "decorative",
}: ChartBackgroundDeModeFieldsProps) {
  const useLineBorder = borderTab === "line";
  const imageOnly = borderTab === "imageOnly";
  const rawMode = value.backgroundMode ?? (value.framePresetId ? "frame" : "image");
  const mode = useLineBorder
    ? rawMode === "border" || rawMode === "frame"
      ? "border"
      : "image"
    : rawMode === "border"
      ? "image"
      : rawMode;

  if (disabled) {
    return (
      <p className="py-1 text-[11px] text-gray-400 dark:text-gray-500">
        {imageOnly
          ? "开启背景后可设置底图"
          : useLineBorder
            ? "开启背景后可设置图片或线框"
            : "开启背景后可设置图片或装饰边框"}
      </p>
    );
  }

  if (imageOnly) {
    return (
      <ImageSourceField
        variant="rail"
        inputClassName={INSPECTOR_CTRL}
        value={value.backgroundImage ?? ""}
        onChange={(backgroundImage) =>
          onChange({
            backgroundImage,
            backgroundShow: true,
            backgroundMode: "image",
            framePresetId: undefined,
            frameColor: undefined,
          })
        }
      />
    );
  }

  const segmentOptions = useLineBorder ? BG_MODE_LINE_BORDER_OPTIONS : BG_MODE_OPTIONS;
  const lineOn = value.borderEnabled !== false;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <DeSegmentGroup
          sizing="fit"
          className="min-w-0"
          value={mode}
          columns={2}
          options={segmentOptions}
          onChange={(next) => {
            if (useLineBorder) {
              onChange({
                backgroundMode: next as "image" | "border",
                backgroundShow: true,
                ...(next === "border"
                  ? {
                      borderEnabled: true,
                      framePresetId: undefined,
                      frameColor: undefined,
                    }
                  : {}),
              });
              return;
            }
            onChange({
              backgroundMode: next as "image" | "frame",
              backgroundShow: true,
              ...(next === "frame" && !value.framePresetId ? { framePresetId: "frame-1" } : {}),
            });
          }}
        />
        {useLineBorder && mode === "border" ? (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">
              显示线框
            </span>
            <Switch
              checked={lineOn}
              onCheckedChange={(show) =>
                onChange({ borderEnabled: show, backgroundShow: true, backgroundMode: "border" })
              }
              aria-label="显示线框"
              className="scale-90"
            />
          </div>
        ) : null}
      </div>
      {mode === "image" ? (
        <ImageSourceField
          variant="rail"
          inputClassName={INSPECTOR_CTRL}
          value={value.backgroundImage ?? ""}
          onChange={(backgroundImage) =>
            onChange({ backgroundImage, backgroundShow: true, backgroundMode: "image" })
          }
        />
      ) : useLineBorder ? (
        <WidgetStyleLineBorderControls value={value} onChange={onChange} showToggle={false} />
      ) : (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <ColorField
            variant="swatch"
            label="装饰色"
            allowClear
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
            className="min-w-0 flex-1"
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

/** @deprecated 使用 WidgetSurfaceAppearanceFields + InspectorNestedSection */
export function WidgetStyleBackgroundExtrasFields({
  value,
  onChange,
  disabled = false,
}: {
  value: WidgetStyleConfig;
  onChange: (patch: BackgroundPatch) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <InspectorNestedSection title="外观" defaultOpen>
      <WidgetSurfaceAppearanceFields value={value} onChange={onChange} density="wide" />
    </InspectorNestedSection>
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
        <InspectorSwitchRow
          label="启用背景"
          checked={showBackground}
          onCheckedChange={(show) => onChange({ backgroundShow: show })}
        />
      ) : null}

      <ChartBackgroundDeModeFields
        value={ws}
        onChange={onChange}
        disabled={!showBackground}
      />

      {showBackground ? (
        <>
          <InspectorNestedSection title="外观" defaultOpen>
            <WidgetSurfaceAppearanceFields
              value={ws}
              onChange={onChange}
              density="narrow"
            />
          </InspectorNestedSection>

          {onBorderChange ? (
            <InspectorNestedSection title="线框" defaultOpen={border?.show === true}>
              <DeAttrToggleRowCompact
                label="显示线框"
                checked={border?.show ?? false}
                onCheckedChange={(show) => onBorderChange({ show })}
              />
              {border?.show ? (
                <div className="space-y-0">
                  <InspectorFieldRow label="线框色">
                    <ColorField
                      compact
                      swatches={WIDGET_BORDER_RECOMMENDED}
                      value={border.color ?? ""}
                      onChange={(color) => onBorderChange({ color: color || undefined })}
                    />
                  </InspectorFieldRow>
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
            </InspectorNestedSection>
          ) : null}

          <InspectorNestedSection title="边距与圆角">
            <WidgetSurfaceSpacingFields value={ws} onChange={onChange} density="narrow" />
          </InspectorNestedSection>
        </>
      ) : null}
    </div>
  );
}

import { ColorField } from "@/components/ui/color-field";
import type { WidgetStyleConfig } from "./dashboardStyleConfig";
import { SURFACE_COLOR_RECOMMENDED } from "./dashboardStyleConfig";
import {
  DashboardConfigGridSlider,
  DashboardConfigSlider,
} from "./deAttrSlider";
import { InspectorSliderField } from "./deAttrSlider";
import { SpacingModeToggle } from "./inspectorSpacing";
import { InspectorFieldRow } from "./inspectorCompact";

export type WidgetSurfaceStyleDensity = "wide" | "narrow";

type PatchFn = (patch: Partial<WidgetStyleConfig>) => void;

/** 组件底 · 外观补充：底色 / 模糊 / 透明度 */
export function WidgetSurfaceAppearanceFields({
  value,
  onChange,
  disabled = false,
  density = "wide",
}: {
  value: WidgetStyleConfig;
  onChange: PatchFn;
  disabled?: boolean;
  density?: WidgetSurfaceStyleDensity;
}) {
  if (disabled) return null;

  const Slider = density === "narrow" ? InspectorSliderField : DashboardConfigSlider;

  return (
    <>
      <Slider
        label="不透明度"
        value={value.opacity != null ? Math.round(value.opacity * 100) : undefined}
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
          value={value.background ?? ""}
          onChange={(background) => onChange({ background: background || undefined })}
        />
      </InspectorFieldRow>
      <Slider
        label="背景模糊"
        value={value.backdropBlur}
        fallback={0}
        min={0}
        max={48}
        step={1}
        unit="px"
        onChange={(backdropBlur) => onChange({ backdropBlur })}
      />
    </>
  );
}

/** 内边距 + 圆角（统一值 / 分边） */
export function WidgetSurfaceSpacingFields({
  value,
  onChange,
  density = "wide",
}: {
  value: WidgetStyleConfig;
  onChange: PatchFn;
  density?: WidgetSurfaceStyleDensity;
}) {
  const paddingMode = value.paddingMode ?? "unified";
  const radiusMode = value.radiusMode ?? "unified";
  const Slider = density === "narrow" ? InspectorSliderField : DashboardConfigSlider;
  const GridSlider = DashboardConfigGridSlider;

  return (
    <>
      <SpacingModeToggle
        label="内边距"
        mode={paddingMode}
        onChange={(paddingMode) => onChange({ paddingMode })}
        compact={density === "narrow"}
      />
      {paddingMode === "unified" ? (
        <Slider
          label="内边距"
          value={value.padding}
          fallback={8}
          min={0}
          max={64}
          step={1}
          unit="px"
          onChange={(padding) => onChange({ padding })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {(
            [
              ["paddingTop", "上"],
              ["paddingRight", "右"],
              ["paddingBottom", "下"],
              ["paddingLeft", "左"],
            ] as const
          ).map(([key, label]) => (
            <GridSlider
              key={key}
              label={label}
              value={value[key]}
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

      <SpacingModeToggle
        label="圆角"
        mode={radiusMode}
        onChange={(radiusMode) => onChange({ radiusMode })}
        compact={density === "narrow"}
      />
      {radiusMode === "unified" ? (
        <Slider
          label="圆角"
          value={value.borderRadius}
          fallback={8}
          min={0}
          max={48}
          step={1}
          unit="px"
          onChange={(borderRadius) => onChange({ borderRadius })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {(
            [
              ["borderRadiusTopLeft", "左上"],
              ["borderRadiusTopRight", "右上"],
              ["borderRadiusBottomLeft", "左下"],
              ["borderRadiusBottomRight", "右下"],
            ] as const
          ).map(([key, label]) => (
            <GridSlider
              key={key}
              label={label}
              value={value[key]}
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
    </>
  );
}

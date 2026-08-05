import { DeAttrField, DeSegmentGroup } from "./dashboardInspectorUi";
import type { WidgetStyleConfig } from "./dashboardStyleConfig";
import {
  WIDGET_BACKGROUND_IMAGE_FIT_OPTIONS,
  WIDGET_BACKGROUND_IMAGE_POSITION_OPTIONS,
  backgroundImageFitSupportsPosition,
  type WidgetBackgroundImageFit,
  type WidgetBackgroundImagePosition,
} from "@/lib/widgetBackgroundImageFit";

type WidgetBackgroundImageFitFieldsProps = {
  value: WidgetStyleConfig;
  onChange: (patch: Partial<WidgetStyleConfig>) => void;
};

export function WidgetBackgroundImageFitFields({
  value,
  onChange,
}: WidgetBackgroundImageFitFieldsProps) {
  if (!value.backgroundImage?.trim()) return null;

  const fit = value.backgroundImageFit ?? "stretch";
  const showPosition = backgroundImageFitSupportsPosition(fit);

  return (
    <div className="space-y-2" data-testid="widget-background-image-fit-fields">
      <DeAttrField label="适应方式" compact className="border-b-0 py-0">
        <DeSegmentGroup
          value={fit}
          options={WIDGET_BACKGROUND_IMAGE_FIT_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          columns={3}
          sizing="fit"
          onChange={(next) =>
            onChange({ backgroundImageFit: next as WidgetBackgroundImageFit })
          }
        />
      </DeAttrField>
      {showPosition ? (
        <DeAttrField label="对齐" compact className="border-b-0 py-0">
          <DeSegmentGroup
            value={value.backgroundImagePosition ?? "center"}
            options={WIDGET_BACKGROUND_IMAGE_POSITION_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            columns={3}
            sizing="fit"
            onChange={(next) =>
              onChange({
                backgroundImagePosition: next as WidgetBackgroundImagePosition,
              })
            }
          />
        </DeAttrField>
      ) : null}
    </div>
  );
}

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartInspectorSection,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT,
  InspectorInlineColorRow,
  InspectorSwitchRow,
} from "../inspectorCompact";
import { ChartDeSliderField } from "../deAttrSlider";
import type { VectorStyleMode } from "@geolibre/core";
import { useGisMapStore, useGisMapStoreSelector } from "./useGisMapStore";

const STYLE_MODES: Array<{ value: VectorStyleMode; label: string }> = [
  { value: "single", label: "简单填色" },
  { value: "graduated", label: "分级" },
  { value: "categorized", label: "分类" },
];

export function GisMapStyleInspector() {
  const { persistProject } = useGisMapStore();
  const selectedLayerId = useGisMapStoreSelector((state) => state.selectedLayerId);
  const layers = useGisMapStoreSelector((state) => state.layers);
  const setLayerStyle = useGisMapStoreSelector((state) => state.setLayerStyle);
  const layer = layers.find((item) => item.id === selectedLayerId) ?? layers[0];

  if (!layer) {
    return (
      <ChartInspectorSection title="符号化" data-testid="gis-map-style-inspector">
        <p className="text-theme-xs text-gray-500">暂无可编辑图层，请先在「底图」中选择离线省界模板。</p>
      </ChartInspectorSection>
    );
  }

  const style = layer.style;
  const patchStyle = (patch: Partial<typeof style>) => {
    setLayerStyle(layer.id, patch);
    persistProject();
  };

  const patchLabels = (patch: Partial<typeof style.labels>) => {
    patchStyle({ labels: { ...style.labels, ...patch } });
  };

  const mode = style.vectorStyleMode ?? "single";

  return (
    <ChartInspectorSection title="符号化" data-testid="gis-map-style-inspector">
      <div className={INSPECTOR_SECTION_GAP}>
        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{layer.name}</p>
        <div>
          <p className="mb-1 text-[11px] text-gray-500">渲染模式</p>
          <Select
            value={mode}
            onValueChange={(value) => patchStyle({ vectorStyleMode: value as VectorStyleMode })}
          >
            <SelectTrigger className={INSPECTOR_SELECT} aria-label="矢量渲染模式">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLE_MODES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "single" ? (
          <>
            <InspectorInlineColorRow
              label="填充色"
              value={style.fillColor ?? "#3b82f6"}
              onChange={(fillColor) => patchStyle({ fillColor })}
            />
            <InspectorInlineColorRow
              label="边线色"
              value={style.strokeColor ?? "#1d4ed8"}
              onChange={(strokeColor) => patchStyle({ strokeColor })}
            />
            <ChartDeSliderField
              label="边线宽度"
              value={style.strokeWidth ?? 1}
              min={0}
              max={8}
              step={0.5}
              onValueChange={(strokeWidth) => patchStyle({ strokeWidth })}
            />
          </>
        ) : null}

        {mode === "graduated" ? (
          <>
            <div>
              <p className="mb-1 text-[11px] text-gray-500">分级字段</p>
              <Input
                className="h-8 text-xs"
                value={style.vectorStyleProperty ?? ""}
                onChange={(event) =>
                  patchStyle({ vectorStyleProperty: event.target.value || undefined })
                }
                placeholder="属性字段名"
              />
            </div>
            <ChartDeSliderField
              label="级数"
              value={style.vectorStyleClassCount ?? 5}
              min={2}
              max={10}
              step={1}
              onValueChange={(vectorStyleClassCount) => patchStyle({ vectorStyleClassCount })}
            />
          </>
        ) : null}

        {mode === "categorized" ? (
          <div>
            <p className="mb-1 text-[11px] text-gray-500">分类字段</p>
            <Input
              className="h-8 text-xs"
              value={style.vectorStyleProperty ?? ""}
              onChange={(event) =>
                patchStyle({ vectorStyleProperty: event.target.value || undefined })
              }
              placeholder="属性字段名"
            />
          </div>
        ) : null}

        <div className="border-t border-gray-100 pt-2 dark:border-white/[0.06]">
          <p className="mb-2 text-[11px] font-medium text-gray-600 dark:text-gray-300">标注</p>
          <InspectorSwitchRow
            label="启用标注"
            checked={style.labels?.enabled ?? false}
            onCheckedChange={(enabled) => patchLabels({ enabled })}
          />
          <InspectorInlineColorRow
            label="标注颜色"
            value={style.labels?.color ?? "#111827"}
            onChange={(color) => patchLabels({ color })}
          />
          <ChartDeSliderField
            label="标注字号"
            value={style.labels?.size ?? 12}
            min={8}
            max={24}
            step={1}
            onValueChange={(size) => patchLabels({ size })}
          />
          <div className="mt-2">
            <p className="mb-1 text-[11px] text-gray-500">标注字段</p>
            <Input
              className="h-8 text-xs"
              value={style.labels?.field ?? ""}
              onChange={(event) => patchLabels({ field: event.target.value })}
              placeholder="name / adcode 等"
            />
          </div>
        </div>
      </div>
    </ChartInspectorSection>
  );
}

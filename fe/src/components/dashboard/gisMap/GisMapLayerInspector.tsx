import { useMemo } from "react";
import { ChartInspectorSection, INSPECTOR_SECTION_GAP, InspectorSwitchRow } from "../inspectorCompact";
import { ChartDeSliderField } from "../deAttrSlider";
import { useGisMapStore, useGisMapStoreSelector } from "./useGisMapStore";

export function GisMapLayerInspector() {
  const { persistProject } = useGisMapStore();
  const layers = useGisMapStoreSelector((state) => state.layers);
  const selectedLayerId = useGisMapStoreSelector((state) => state.selectedLayerId);
  const selectLayer = useGisMapStoreSelector((state) => state.selectLayer);
  const setLayerVisibility = useGisMapStoreSelector((state) => state.setLayerVisibility);
  const setLayerOpacity = useGisMapStoreSelector((state) => state.setLayerOpacity);
  const reorderLayer = useGisMapStoreSelector((state) => state.reorderLayer);
  const setBasemapVisible = useGisMapStoreSelector((state) => state.setBasemapVisible);
  const setBasemapOpacity = useGisMapStoreSelector((state) => state.setBasemapOpacity);
  const basemapVisible = useGisMapStoreSelector((state) => state.basemapVisible);
  const basemapOpacity = useGisMapStoreSelector((state) => state.basemapOpacity);

  const orderedLayers = useMemo(() => layers.slice().reverse(), [layers]);

  return (
    <ChartInspectorSection title="图层" data-testid="gis-map-layer-inspector">
      <div className={INSPECTOR_SECTION_GAP}>
        <InspectorSwitchRow
          label="底图可见"
          checked={basemapVisible}
          onCheckedChange={(visible) => {
            setBasemapVisible(visible);
            persistProject();
          }}
        />
        <ChartDeSliderField
          label="底图透明度"
          value={Math.round(basemapOpacity * 100)}
          min={0}
          max={100}
          onValueChange={(value) => {
            setBasemapOpacity(value / 100);
            persistProject();
          }}
        />
        {orderedLayers.map((layer, index) => (
          <div
            key={layer.id}
            className="rounded-md border border-gray-100 p-2 dark:border-white/[0.06]"
          >
            <button
              type="button"
              className="mb-2 w-full text-left text-[11px] font-medium text-gray-700 dark:text-gray-200"
              onClick={() => {
                selectLayer(layer.id);
                persistProject();
              }}
            >
              {layer.name}
              {selectedLayerId === layer.id ? "（当前）" : ""}
            </button>
            <InspectorSwitchRow
              label="可见"
              checked={layer.visible}
              onCheckedChange={(visible) => {
                setLayerVisibility(layer.id, visible);
                persistProject();
              }}
            />
            <ChartDeSliderField
              label="透明度"
              value={Math.round(layer.opacity * 100)}
              min={0}
              max={100}
              onValueChange={(value) => {
                setLayerOpacity(layer.id, value / 100);
                persistProject();
              }}
            />
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                className="rounded border px-2 py-1 text-[10px] text-gray-600 disabled:opacity-40 dark:text-gray-300"
                disabled={index === 0}
                onClick={() => {
                  reorderLayer(layer.id, "up");
                  persistProject();
                }}
              >
                上移
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-[10px] text-gray-600 disabled:opacity-40 dark:text-gray-300"
                disabled={index === orderedLayers.length - 1}
                onClick={() => {
                  reorderLayer(layer.id, "down");
                  persistProject();
                }}
              >
                下移
              </button>
            </div>
          </div>
        ))}
      </div>
    </ChartInspectorSection>
  );
}

import { GisMapBasemapInspector } from "./GisMapBasemapInspector";
import { GisMapLayerInspector } from "./GisMapLayerInspector";
import { GisMapStyleInspector } from "./GisMapStyleInspector";

export function GisMapInspector() {
  return (
    <div className="flex flex-col gap-0" data-testid="gis-map-inspector">
      <GisMapBasemapInspector />
      <GisMapLayerInspector />
      <GisMapStyleInspector />
    </div>
  );
}

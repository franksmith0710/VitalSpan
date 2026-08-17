import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartInspectorSection, INSPECTOR_SECTION_GAP, INSPECTOR_SELECT } from "../inspectorCompact";
import {
  applyBasemapChoice,
  basemapChoiceFromProject,
  readGeolibreProject,
  type VitalSpanBasemapChoice,
} from "@/components/charts/engine/geolibre/geolibreProject";
import { loadWidgetGeoLibreProject } from "@/components/charts/engine/geolibre/geolibreWidgetStore";
import { useChartInspector } from "../chartInspectorContext";
import { useGisMapStore } from "./useGisMapStore";

const BASEMAP_OPTIONS: Array<{ value: VitalSpanBasemapChoice; label: string }> = [
  { value: "blank", label: "空白底图" },
  { value: "china-provinces", label: "离线中国省界" },
];

export function GisMapBasemapInspector() {
  const { cfg, onChange } = useChartInspector();
  const { store, persistProject } = useGisMapStore();
  const project = readGeolibreProject(cfg);
  const choice = basemapChoiceFromProject(project);

  return (
    <ChartInspectorSection title="底图" data-testid="gis-map-basemap-inspector">
      <div className={INSPECTOR_SECTION_GAP}>
        <p className="text-[11px] text-gray-500">仅支持离线模板，不使用在线 OpenFreeMap。</p>
        <Select
          value={choice}
          onValueChange={(value) => {
            const nextProject = applyBasemapChoice(project, value as VitalSpanBasemapChoice);
            loadWidgetGeoLibreProject(store, nextProject);
            onChange({
              ...cfg,
              nativeBody: { ...cfg.nativeBody, geolibreProject: nextProject },
            });
            persistProject();
          }}
        >
          <SelectTrigger className={INSPECTOR_SELECT} aria-label="GIS 底图模板">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BASEMAP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ChartInspectorSection>
  );
}

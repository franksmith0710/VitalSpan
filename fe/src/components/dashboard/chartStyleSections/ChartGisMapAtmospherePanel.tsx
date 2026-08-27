import { useCallback, useMemo } from "react";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
} from "@/components/dashboard/inspectorCompact";
import {
  GIS_ATMOSPHERE_PRESETS,
  readGisProject,
  writeGisProject,
  type GisProjectFog,
} from "@/components/charts/engine/maplibre/gisProject";
import {
  DEFAULT_GIS_HALO_COLOR,
  GEOLIBRE_HALO_RANGE_DEFAULT,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";
import { resolveGisProjectHalo, type GisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import { applyGisMapViewAtmosphere } from "@/components/charts/engine/maplibre/gisMapViewBridge";

const ATMOSPHERE_HINT =
  "对标 GeoLibre「大气效果」：光晕与深空色；仅球面地球生效。";

export function ChartGisMapAtmospherePanel() {
  const { cfg, widget, mutateChartConfig } = useChartInspector();
  const project = readGisProject(cfg);
  const resolvedHalo = useMemo(
    () => resolveGisProjectHalo(project.halo, project.atmospherePreset),
    [project.atmospherePreset, project.halo],
  );

  const patchProject = useCallback(
    (patch: Parameters<typeof writeGisProject>[1]) => {
      mutateChartConfig((current) => writeGisProject(current, patch));
    },
    [mutateChartConfig],
  );

  const previewAtmosphere = useCallback(
    (patch: { fog?: GisProjectFog; halo?: GisProjectHalo }) => {
      const preset = project.atmospherePreset ?? "night";
      const baseFog = project.fog ?? GIS_ATMOSPHERE_PRESETS[preset];
      applyGisMapViewAtmosphere(widget.id, {
        atmospherePreset: preset,
        projection: project.projection,
        fog: patch.fog ?? baseFog,
        halo: patch.halo ?? project.halo,
      });
    },
    [project.atmospherePreset, project.fog, project.halo, project.projection, widget.id],
  );

  const patchHalo = useCallback(
    (patch: Partial<GisProjectHalo>) => {
      const nextHalo = { ...project.halo, ...patch };
      previewAtmosphere({ halo: nextHalo });
      patchProject({ halo: nextHalo });
    },
    [patchProject, previewAtmosphere, project.halo],
  );

  const patchSpaceColor = useCallback(
    (spaceColor: string) => {
      const preset = project.atmospherePreset ?? "night";
      const base = project.fog ?? GIS_ATMOSPHERE_PRESETS[preset];
      const nextFog = { ...base, "space-color": spaceColor };
      previewAtmosphere({ fog: nextFog });
      patchProject({ fog: nextFog });
    },
    [patchProject, previewAtmosphere, project.atmospherePreset, project.fog],
  );

  const resetDefaults = () => {
    const preset = project.atmospherePreset ?? "night";
    const fog = { ...GIS_ATMOSPHERE_PRESETS[preset] };
    previewAtmosphere({ fog, halo: undefined });
    patchProject({ fog, halo: undefined });
  };

  if (project.projection !== "globe") {
    return (
      <ChartInspectorSection title="大气效果" hint={ATMOSPHERE_HINT} data-testid="chart-gis-map-atmosphere-panel">
        <p className="text-theme-xs text-gray-500">请先将投影设为「球面地球」。</p>
      </ChartInspectorSection>
    );
  }

  return (
    <ChartInspectorSection title="大气效果" hint={ATMOSPHERE_HINT} data-testid="chart-gis-map-atmosphere-panel">
      <div className={INSPECTOR_SECTION_GAP}>
        <p className="text-theme-xs text-brand-500">已启用</p>
        <div className="flex min-w-0 items-center gap-2">
          <ChartPaletteColorSwatch
            value={resolvedHalo.color}
            aria-label="光晕颜色"
            onChange={(color) => patchHalo({ color })}
          />
          <InspectorFieldLabel label="光晕颜色" />
        </div>
        <InspectorSliderField
          label="光晕范围"
          value={Math.round(resolvedHalo.outerScale * 100) / 100}
          min={1}
          max={6}
          step={0.05}
          unit="x"
          onChange={(outerScale) => patchHalo({ outerScale })}
        />
        <InspectorSliderField
          label="光晕强度"
          value={Math.round(resolvedHalo.opacity * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(opacity) => patchHalo({ opacity: opacity / 100 })}
        />
        <div className="flex min-w-0 items-center gap-2">
          <ChartPaletteColorSwatch
            value={project.fog?.["space-color"] ?? "#0b0b19"}
            aria-label="太空颜色"
            onChange={patchSpaceColor}
          />
          <InspectorFieldLabel label="太空颜色" hint="MapLibre fog space-color" />
        </div>
        <button
          type="button"
          className="text-theme-xs text-brand-500 hover:underline"
          onClick={resetDefaults}
        >
          恢复默认设置
        </button>
        <p className="text-[10px] text-gray-400">
          默认光晕色 {DEFAULT_GIS_HALO_COLOR} · 范围 {GEOLIBRE_HALO_RANGE_DEFAULT}x
        </p>
      </div>
    </ChartInspectorSection>
  );
}

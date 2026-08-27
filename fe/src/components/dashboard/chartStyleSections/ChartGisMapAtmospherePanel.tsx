import { useCallback, useMemo } from "react";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
} from "@/components/dashboard/inspectorCompact";
import { readGisProject, writeGisProject } from "@/components/charts/engine/maplibre/gisProject";
import {
  DEFAULT_GIS_EFFECTS_SETTINGS,
  GIS_HALO_EXTENT_MAX,
  GIS_HALO_EXTENT_MIN,
  GIS_HALO_OPACITY_MAX,
  GIS_HALO_OPACITY_MIN,
} from "@/components/charts/engine/maplibre/gisGeolibreEffectsSettings";
import {
  resolveGisEffectsSettings,
  type GisEffectsSettings,
} from "@/components/charts/engine/maplibre/gisProjectEffects";
import { applyGisMapViewAtmosphere } from "@/components/charts/engine/maplibre/gisMapViewBridge";

const ATMOSPHERE_HINT =
  "对标 GeoLibre「大气效果」：光晕颜色/范围/强度与深空色；仅球面地球生效。";

export function ChartGisMapAtmospherePanel() {
  const { cfg, widget, mutateChartConfig } = useChartInspector();
  const project = readGisProject(cfg);
  const resolved = useMemo(
    () => resolveGisEffectsSettings(project),
    [project.effects, project.fog, project.halo],
  );

  const patchProject = useCallback(
    (patch: Parameters<typeof writeGisProject>[1]) => {
      mutateChartConfig((current) => writeGisProject(current, patch));
    },
    [mutateChartConfig],
  );

  const previewAtmosphere = useCallback(
    (effects: GisEffectsSettings) => {
      applyGisMapViewAtmosphere(widget.id, {
        atmospherePreset: project.atmospherePreset,
        projection: project.projection,
        effects,
        fog: project.fog,
        halo: project.halo,
      });
    },
    [project.atmospherePreset, project.fog, project.halo, project.projection, widget.id],
  );

  const patchEffects = useCallback(
    (patch: Partial<GisEffectsSettings>) => {
      const nextEffects = { ...project.effects, ...patch };
      previewAtmosphere(nextEffects);
      patchProject({ effects: nextEffects, halo: undefined });
    },
    [patchProject, previewAtmosphere, project.effects],
  );

  const resetDefaults = () => {
    previewAtmosphere({});
    patchProject({ effects: undefined, halo: undefined });
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
            value={resolved.haloColor}
            aria-label="光晕颜色"
            onChange={(haloColor) => patchEffects({ haloColor })}
          />
          <InspectorFieldLabel label="光晕颜色" />
        </div>
        <InspectorSliderField
          label="光晕范围"
          value={Math.round(resolved.haloExtent * 100) / 100}
          min={GIS_HALO_EXTENT_MIN}
          max={GIS_HALO_EXTENT_MAX}
          step={0.05}
          unit="x"
          onChange={(haloExtent) => patchEffects({ haloExtent })}
        />
        <InspectorSliderField
          label="光晕强度"
          value={Math.round(resolved.haloOpacity * 100)}
          min={Math.round(GIS_HALO_OPACITY_MIN * 100)}
          max={Math.round(GIS_HALO_OPACITY_MAX * 100)}
          step={1}
          unit="%"
          onChange={(opacity) => patchEffects({ haloOpacity: opacity / 100 })}
        />
        <div className="flex min-w-0 items-center gap-2">
          <ChartPaletteColorSwatch
            value={resolved.spaceColor}
            aria-label="太空颜色"
            onChange={(spaceColor) => patchEffects({ spaceColor })}
          />
          <InspectorFieldLabel label="太空颜色" hint="深空 radial backdrop 中心色" />
        </div>
        <button
          type="button"
          className="text-theme-xs text-brand-500 hover:underline"
          onClick={resetDefaults}
        >
          恢复默认设置
        </button>
        <p className="text-[10px] text-gray-400">
          默认光晕 {DEFAULT_GIS_EFFECTS_SETTINGS.haloColor} · 范围{" "}
          {DEFAULT_GIS_EFFECTS_SETTINGS.haloExtent}x · 深空 {DEFAULT_GIS_EFFECTS_SETTINGS.spaceColor}
        </p>
      </div>
    </ChartInspectorSection>
  );
}

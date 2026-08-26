import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { ChartPaletteColorSwatch } from "@/components/dashboard/chartPaletteShared";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import { defaultBasemapPaletteForFlavor } from "@/components/charts/engine/maplibre/gisBasemapPalette";
import {
  ChartInspectorSection,
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
  InspectorHintTip,
} from "@/components/dashboard/inspectorCompact";
import {
  DEFAULT_GIS_GLOBE_VIEW,
  DEFAULT_PMTILES_TILE_SERVICE_ID,
  finalizeGisViewDraftField,
  formatGisViewDraftFromView,
  GIS_VIEW_BOUNDS,
  GIS_VIEW_DECIMALS,
  GIS_ATMOSPHERE_PRESET_ORDER,
  GIS_ATMOSPHERE_PRESETS,
  GIS_BASEMAP_FLAVORS,
  normalizeGisProjectView,
  parseGisViewDraft,
  readGisProject,
  writeGisProject,
  type GisAtmospherePreset,
  type GisBasemapFlavor,
  type GisLabelLang,
  type GisProjectFog,
  type GisViewDraftFields,
} from "@/components/charts/engine/maplibre/gisProject";
import { captureGisMapViewCamera, applyGisMapViewCamera } from "@/components/charts/engine/maplibre/gisMapViewBridge";
import {
  buildGisConfiguredViewKey,
  GLOBE_IDLE_ROTATION_DEG_PER_SEC,
} from "@/components/charts/engine/maplibre/gisMapRuntime";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_PUNCH_INSET,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";
import type { GisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import { resolveGisProjectHalo } from "@/components/charts/engine/maplibre/gisProjectHalo";
import { listTileServices } from "@/lib/tileServices";

const GIS_VIEW_STEP = 10 ** -GIS_VIEW_DECIMALS;

const GIS_VIEW_HINT =
  "经度 −180–180、纬度 −85–85、缩放 0–22、旋转 −180–180°、倾斜 0–85°；保留两位小数。拖拽地图后点「读取当前视角」写回；改视角会关闭球面自转。";

const FLAVOR_LABELS: Record<GisBasemapFlavor, string> = {
  light: "浅色",
  dark: "深色",
  grayscale: "灰度",
  white: "留白",
  black: "纯黑",
};

const ATMOSPHERE_LABELS: Record<GisAtmospherePreset, string> = {
  day: "白昼",
  night: "黑夜",
};

const GIS_SECTION_HINT =
  "全球矢量 PMTiles 底图（如 Planet Z15），由运维独立部署并登记；未登记时无法出图。";

export function ChartGisMapProjectPanel() {
  const { cfg, widget, mutateChartConfig } = useChartInspector();
  const project = readGisProject(cfg);
  const view = project.view ?? DEFAULT_GIS_GLOBE_VIEW;
  const flavorPalette = useMemo(
    () => defaultBasemapPaletteForFlavor(project.basemapFlavor ?? "light"),
    [project.basemapFlavor],
  );
  const {
    data: tileServices = [],
    isError: tileServicesError,
    isLoading: tileServicesLoading,
  } = useQuery({
    queryKey: ["tile-services"],
    queryFn: listTileServices,
    retry: false,
  });

  const enabledTileServices = tileServices.filter((service) => service.enabled);

  const patchProject = useCallback(
    (patch: Parameters<typeof writeGisProject>[1]) => {
      mutateChartConfig((current) => writeGisProject(current, patch));
    },
    [mutateChartConfig],
  );

  const initialViewDraft = formatGisViewDraftFromView(view);
  const [centerLng, setCenterLng] = useState(initialViewDraft.centerLng);
  const [centerLat, setCenterLat] = useState(initialViewDraft.centerLat);
  const [zoom, setZoom] = useState(initialViewDraft.zoom);
  const [bearing, setBearing] = useState(initialViewDraft.bearing);
  const [pitch, setPitch] = useState(initialViewDraft.pitch);
  const viewDraftRef = useRef({ centerLng, centerLat, zoom, bearing, pitch });
  viewDraftRef.current = { centerLng, centerLat, zoom, bearing, pitch };
  const committedViewKeyRef = useRef("");

  const commitView = useCallback(
    (next: {
      center?: [number, number];
      zoom?: number;
      bearing?: number;
      pitch?: number;
    }) => {
      mutateChartConfig((current) => {
        const currentProject = readGisProject(current);
        const currentView = currentProject.view ?? DEFAULT_GIS_GLOBE_VIEW;
        return writeGisProject(current, {
          ...(currentProject.autoRotate ? { autoRotate: false } : {}),
          view: {
            center: next.center ?? currentView.center,
            zoom: next.zoom ?? currentView.zoom,
            bearing: next.bearing ?? currentView.bearing ?? 0,
            pitch: next.pitch ?? currentView.pitch ?? 0,
          },
        });
      });
    },
    [mutateChartConfig],
  );

  const applyViewDraft = useCallback(() => {
    const nextView = parseGisViewDraft(viewDraftRef.current);
    if (!nextView) return;
    const nextKey = buildGisConfiguredViewKey(nextView);
    if (nextKey === committedViewKeyRef.current) return;
    applyGisMapViewCamera(widget.id, nextView);
    committedViewKeyRef.current = nextKey;
    commitView(nextView);
  }, [commitView, widget.id]);

  const patchViewDraft = useCallback(
    (patch: Partial<typeof viewDraftRef.current>) => {
      viewDraftRef.current = { ...viewDraftRef.current, ...patch };
      applyViewDraft();
    },
    [applyViewDraft],
  );

  const blurViewField = useCallback(
    (field: keyof GisViewDraftFields, setter: (value: string) => void) => {
      const formatted = finalizeGisViewDraftField(field, viewDraftRef.current[field]);
      setter(formatted);
      patchViewDraft({ [field]: formatted });
    },
    [patchViewDraft],
  );

  const committedViewKey = useMemo(
    () => buildGisConfiguredViewKey(view),
    [view.bearing, view.center[0], view.center[1], view.pitch, view.zoom],
  );
  committedViewKeyRef.current = committedViewKey;

  useEffect(() => {
    const draft = formatGisViewDraftFromView(view);
    setCenterLng(draft.centerLng);
    setCenterLat(draft.centerLat);
    setZoom(draft.zoom);
    setBearing(draft.bearing);
    setPitch(draft.pitch);
    viewDraftRef.current = draft;
  }, [committedViewKey]);

  useEffect(() => {
    if (tileServicesLoading || enabledTileServices.length === 0) return;
    const currentId = project.tileServiceId;
    if (currentId && enabledTileServices.some((service) => service.id === currentId)) return;
    const preferred =
      enabledTileServices.find((service) => service.id === DEFAULT_PMTILES_TILE_SERVICE_ID) ??
      enabledTileServices[0];
    if (preferred && preferred.id !== currentId) {
      mutateChartConfig((current) => writeGisProject(current, { tileServiceId: preferred.id }));
    }
  }, [cfg, enabledTileServices, mutateChartConfig, project.tileServiceId, tileServicesLoading]);

  const commitCenterLng = () => blurViewField("centerLng", setCenterLng);
  const commitCenterLat = () => blurViewField("centerLat", setCenterLat);
  const commitZoom = () => blurViewField("zoom", setZoom);
  const commitBearing = () => blurViewField("bearing", setBearing);
  const commitPitch = () => blurViewField("pitch", setPitch);

  const captureCurrentView = () => {
    const captured = captureGisMapViewCamera(widget.id);
    if (!captured) return;
    const normalized = normalizeGisProjectView(captured);
    mutateChartConfig((current) => {
      const currentProject = readGisProject(current);
      return writeGisProject(current, {
        view: normalized,
        ...(currentProject.autoRotate ? { autoRotate: false } : {}),
      });
    });
  };

  const onEnterCommit = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
    event.currentTarget.blur();
  };

  const applyAtmospherePreset = (preset: GisAtmospherePreset) => {
    patchProject({
      atmospherePreset: preset,
      fog: GIS_ATMOSPHERE_PRESETS[preset],
    });
  };

  const patchFog = (patch: Partial<GisProjectFog>) => {
    const preset = project.atmospherePreset ?? "night";
    const base = project.fog ?? GIS_ATMOSPHERE_PRESETS[preset];
    patchProject({ fog: { ...base, ...patch } });
  };

  const patchHalo = (patch: Partial<GisProjectHalo>) => {
    patchProject({ halo: { ...project.halo, ...patch } });
  };

  const resolvedHalo = useMemo(
    () => resolveGisProjectHalo(project.halo, project.atmospherePreset),
    [project.atmospherePreset, project.halo],
  );

  const [advancedAtmosphereOpen, setAdvancedAtmosphereOpen] = useState(false);

  return (
    <ChartInspectorSection
      title="GIS 底图"
      hint={GIS_SECTION_HINT}
      data-testid="chart-gis-map-project-panel"
    >
      <div className={INSPECTOR_SECTION_GAP}>
        <div className="grid gap-1.5">
          <InspectorFieldLabel label="全球 PMTiles 服务" />
          <Select
            value={project.tileServiceId ?? ""}
            onValueChange={(tileServiceId) => patchProject({ tileServiceId })}
          >
            <SelectTrigger className={INSPECTOR_CTRL} aria-label="全球 PMTiles 服务">
              <SelectValue placeholder="选择已登记的全球底图服务" />
            </SelectTrigger>
            <SelectContent>
              {enabledTileServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tileServicesLoading ? (
            <p className="text-[10px] text-gray-400">正在加载…</p>
          ) : tileServicesError ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              无法加载服务列表，请确认已登录且后端可用。
            </p>
          ) : enabledTileServices.length === 0 ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              尚未登记 PMTiles 服务，请联系管理员。
            </p>
          ) : !project.tileServiceId ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">请选择已登记服务。</p>
          ) : null}

          <div className="grid gap-1.5">
            <InspectorFieldLabel
              label="底图风格"
              hint="预设含道路、边界与标注；可单独改海洋/陆地色或隐藏图层。"
            />
            <Select
              value={project.basemapFlavor ?? "light"}
              onValueChange={(basemapFlavor) =>
                patchProject({
                  basemapFlavor: basemapFlavor as GisBasemapFlavor,
                  landColor: undefined,
                  waterColor: undefined,
                })
              }
            >
              <SelectTrigger className={INSPECTOR_CTRL} aria-label="底图风格">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GIS_BASEMAP_FLAVORS.map((flavor) => (
                  <SelectItem key={flavor} value={flavor}>
                    {FLAVOR_LABELS[flavor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <ChartPaletteColorSwatch
                value={project.landColor ?? flavorPalette.landColor}
                aria-label="陆地颜色"
                onChange={(landColor) => patchProject({ landColor })}
              />
              <InspectorFieldLabel
                label="陆地底色"
                hint="覆写 earth 与陆地细节；关闭「陆地细节」时仅保留纯色底。"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <ChartPaletteColorSwatch
                value={project.waterColor ?? flavorPalette.waterColor}
                aria-label="海洋颜色"
                onChange={(waterColor) => patchProject({ waterColor })}
              />
              <InspectorFieldLabel label="海洋颜色" />
            </div>
          </div>
          {project.landColor || project.waterColor ? (
            <button
              type="button"
              className="text-theme-xs text-brand-500 hover:underline"
              onClick={() => patchProject({ landColor: undefined, waterColor: undefined })}
            >
              恢复预设配色
            </button>
          ) : null}

          <div className="grid gap-2 rounded-md border border-gray-200 p-2 dark:border-gray-800">
            <InspectorFieldLabel label="底图图层" />
            {(
              [
                ["roads", "道路"],
                ["labels", "标注"],
                ["boundaries", "边界"],
                ["landDetail", "陆地细节"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
                <Checkbox
                  checked={project.basemapLayers?.[key] !== false}
                  onCheckedChange={(checked) => {
                    const next = { ...project.basemapLayers };
                    if (checked === true) delete next[key];
                    else next[key] = false;
                    patchProject({
                      basemapLayers: Object.keys(next).length > 0 ? next : undefined,
                    });
                  }}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="grid gap-1.5">
            <InspectorFieldLabel label="标注语言" />
            <Select
              value={project.labelLang ?? "zh-Hans"}
              onValueChange={(labelLang) => patchProject({ labelLang: labelLang as GisLabelLang })}
            >
              <SelectTrigger className={INSPECTOR_CTRL} aria-label="标注语言">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-Hans">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <InspectorFieldLabel label="投影" />
            <Select
              value={project.projection ?? "mercator"}
              onValueChange={(projection) => {
                if (projection === "globe") {
                  const preset = project.atmospherePreset ?? "night";
                  patchProject({
                    projection: "globe",
                    atmospherePreset: preset,
                    fog: project.fog ?? GIS_ATMOSPHERE_PRESETS[preset],
                    view: project.view ?? DEFAULT_GIS_GLOBE_VIEW,
                  });
                  return;
                }
                patchProject({ projection: "mercator", fog: undefined, atmospherePreset: undefined });
              }}
            >
              <SelectTrigger className={INSPECTOR_CTRL} aria-label="投影">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mercator">平面墨卡托</SelectItem>
                <SelectItem value="globe">球面地球</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {project.projection === "globe" ? (
            <div className="grid gap-1.5">
              <InspectorFieldLabel label="大气预设" hint="黑夜含星空与流星；白昼无星点。" />
              <Select
                value={project.atmospherePreset ?? "night"}
                onValueChange={(preset) => applyAtmospherePreset(preset as GisAtmospherePreset)}
              >
                <SelectTrigger className={INSPECTOR_CTRL} aria-label="大气预设">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GIS_ATMOSPHERE_PRESET_ORDER.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {ATMOSPHERE_LABELS[preset]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {project.projection === "globe" ? (
            <Collapsible open={advancedAtmosphereOpen} onOpenChange={setAdvancedAtmosphereOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-1 text-theme-xs text-gray-600 hover:text-brand-500 dark:text-gray-300">
                {advancedAtmosphereOpen ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
                高级大气与光晕
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 grid gap-2">
                <InspectorSliderField
                  label="地平线混合"
                  hint="MapLibre fog horizon-blend；越大大气带越宽"
                  value={Math.round((project.fog?.["horizon-blend"] ?? 0.02) * 1000) / 10}
                  min={0}
                  max={10}
                  step={0.5}
                  unit="%"
                  onChange={(next) => patchFog({ "horizon-blend": next / 100 })}
                />
                <InspectorSliderField
                  label="星点强度"
                  hint="黑夜 preset 下 MapLibre 星场；白昼通常为 0"
                  value={Math.round((project.fog?.["star-intensity"] ?? 0) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(next) => patchFog({ "star-intensity": next / 100 })}
                />
                <div className="flex min-w-0 items-center gap-2">
                  <ChartPaletteColorSwatch
                    value={project.fog?.["space-color"] ?? "#0b0b19"}
                    aria-label="深空底色"
                    onChange={(spaceColor) => patchFog({ "space-color": spaceColor })}
                  />
                  <InspectorFieldLabel label="深空底色" hint="MapLibre fog space-color" />
                </div>
                <InspectorSliderField
                  label="光晕外缘倍数"
                  hint={`GeoLibre 默认 ${GEOLIBRE_HALO_OUTER_SCALE}`}
                  value={Math.round(resolvedHalo.outerScale * 100) / 100}
                  min={1}
                  max={6}
                  step={0.1}
                  onChange={(outerScale) => patchHalo({ outerScale })}
                />
                <InspectorSliderField
                  label="光晕内缘 inset"
                  hint={`GeoLibre 默认 ${GEOLIBRE_HALO_PUNCH_INSET}`}
                  value={Math.round(resolvedHalo.punchInset * 1000) / 1000}
                  min={0.5}
                  max={1}
                  step={0.005}
                  onChange={(punchInset) => patchHalo({ punchInset })}
                />
                <InspectorSliderField
                  label="光晕不透明度"
                  value={Math.round(resolvedHalo.opacity * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(next) => patchHalo({ opacity: next / 100 })}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {project.projection === "globe" ? (
            <InspectorSliderField
              label="地球不透明度"
              layout="stacked"
              hint="仅作用于地球表面层，可透出后方星空；默认 100%。"
              value={project.earthOpacity != null ? Math.round(project.earthOpacity * 100) : undefined}
              fallback={100}
              min={0}
              max={100}
              step={1}
              unit="%"
              ariaLabel="地球不透明度"
              onChange={(opacityPercent) =>
                patchProject({ earthOpacity: Math.max(0, Math.min(100, opacityPercent)) / 100 })
              }
              onPreviewChange={(opacityPercent) => {
                if (opacityPercent == null) return;
                patchProject({ earthOpacity: Math.max(0, Math.min(100, opacityPercent)) / 100 });
              }}
            />
          ) : null}
        </div>

        <div className="grid gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <div className="flex items-center justify-between gap-2">
            <InspectorFieldLabel label="初始视角" hint={GIS_VIEW_HINT} />
            <button
              type="button"
              className="shrink-0 text-[10px] text-brand-500 hover:underline"
              onClick={captureCurrentView}
            >
              读取当前视角
            </button>
          </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="中心经度" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              type="number"
              min={GIS_VIEW_BOUNDS.lng.min}
              max={GIS_VIEW_BOUNDS.lng.max}
              step={GIS_VIEW_STEP}
              aria-label="中心经度"
              value={centerLng}
              onChange={(e) => {
                setCenterLng(e.target.value);
                patchViewDraft({ centerLng: e.target.value });
              }}
              onBlur={commitCenterLng}
              onKeyDown={onEnterCommit(commitCenterLng)}
            />
          </div>
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="中心纬度" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              type="number"
              min={GIS_VIEW_BOUNDS.lat.min}
              max={GIS_VIEW_BOUNDS.lat.max}
              step={GIS_VIEW_STEP}
              aria-label="中心纬度"
              value={centerLat}
              onChange={(e) => {
                setCenterLat(e.target.value);
                patchViewDraft({ centerLat: e.target.value });
              }}
              onBlur={commitCenterLat}
              onKeyDown={onEnterCommit(commitCenterLat)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="缩放" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              type="number"
              min={GIS_VIEW_BOUNDS.zoom.min}
              max={GIS_VIEW_BOUNDS.zoom.max}
              step={GIS_VIEW_STEP}
              aria-label="缩放"
              value={zoom}
              onChange={(e) => {
                setZoom(e.target.value);
                patchViewDraft({ zoom: e.target.value });
              }}
              onBlur={commitZoom}
              onKeyDown={onEnterCommit(commitZoom)}
            />
          </div>
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="旋转°" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              type="number"
              min={GIS_VIEW_BOUNDS.bearing.min}
              max={GIS_VIEW_BOUNDS.bearing.max}
              step={GIS_VIEW_STEP}
              aria-label="旋转"
              value={bearing}
              onChange={(e) => {
                setBearing(e.target.value);
                patchViewDraft({ bearing: e.target.value });
              }}
              onBlur={commitBearing}
              onKeyDown={onEnterCommit(commitBearing)}
            />
          </div>
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="倾斜°" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              type="number"
              min={GIS_VIEW_BOUNDS.pitch.min}
              max={GIS_VIEW_BOUNDS.pitch.max}
              step={GIS_VIEW_STEP}
              aria-label="倾斜"
              value={pitch}
              onChange={(e) => {
                setPitch(e.target.value);
                patchViewDraft({ pitch: e.target.value });
              }}
              onBlur={commitPitch}
              onKeyDown={onEnterCommit(commitPitch)}
            />
          </div>
        </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
            <Checkbox
              checked={project.showControls === true}
              onCheckedChange={(checked) => patchProject({ showControls: checked === true })}
            />
            显示缩放与比例尺控件
          </label>
          <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
            <Checkbox
              checked={project.buildings3d !== false}
              onCheckedChange={(checked) => patchProject({ buildings3d: checked === true })}
            />
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span>建筑 3D 挤出</span>
              <InspectorHintTip text="zoom ≥ 15；OSM 高度缺失时默认 10m；建议 pitch 45°–60°。" />
            </span>
          </label>
          {project.projection === "globe" ? (
            <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
              <Checkbox
                checked={project.autoRotate === true}
                onCheckedChange={(checked) => patchProject({ autoRotate: checked === true })}
              />
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span>球面自转</span>
                <InspectorHintTip text="沿地轴自西向东慢速旋转。" />
              </span>
            </label>
          ) : null}
          {project.projection === "globe" && project.autoRotate ? (
            <InspectorSliderField
              label="自转速度"
              hint={`默认约 8 分钟/圈（${GLOBE_IDLE_ROTATION_DEG_PER_SEC.toFixed(4)}°/s）`}
              value={Math.round((project.autoRotateSpeed ?? GLOBE_IDLE_ROTATION_DEG_PER_SEC) * 10000) / 10000}
              min={0.01}
              max={2}
              step={0.01}
              unit="°/s"
              onChange={(autoRotateSpeed) => patchProject({ autoRotateSpeed })}
            />
          ) : null}
        </div>
      </div>
    </ChartInspectorSection>
  );
}

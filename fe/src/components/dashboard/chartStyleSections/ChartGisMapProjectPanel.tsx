import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
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
  GIS_ATMOSPHERE_PRESET_ORDER,
  GIS_ATMOSPHERE_PRESETS,
  GIS_BASEMAP_FLAVORS,
  readGisProject,
  writeGisProject,
  type GisAtmospherePreset,
  type GisBasemapFlavor,
  type GisLabelLang,
} from "@/components/charts/engine/maplibre/gisProject";
import { captureGisMapViewCamera, applyGisMapViewCamera } from "@/components/charts/engine/maplibre/gisMapViewBridge";
import { buildGisConfiguredViewKey } from "@/components/charts/engine/maplibre/gisMapRuntime";
import { listTileServices } from "@/lib/tileServices";

function parseViewDraft(draft: {
  centerLng: string;
  centerLat: string;
  zoom: string;
  bearing: string;
  pitch: string;
}) {
  if (
    draft.centerLng.trim() === "" ||
    draft.centerLat.trim() === "" ||
    draft.zoom.trim() === "" ||
    draft.bearing.trim() === "" ||
    draft.pitch.trim() === ""
  ) {
    return null;
  }
  const lng = Number(draft.centerLng);
  const lat = Number(draft.centerLat);
  const zoom = Number(draft.zoom);
  const bearing = Number(draft.bearing);
  const pitch = Number(draft.pitch);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lat < -85 || lat > 85) return null;
  if (!Number.isFinite(zoom) || !Number.isFinite(bearing) || !Number.isFinite(pitch)) return null;
  return {
    center: [lng, lat] as [number, number],
    zoom: Math.max(0, Math.min(22, zoom)),
    bearing,
    pitch: Math.max(0, Math.min(85, pitch)),
  };
}

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

  const [centerLng, setCenterLng] = useState(String(view.center[0]));
  const [centerLat, setCenterLat] = useState(String(view.center[1]));
  const [zoom, setZoom] = useState(String(view.zoom));
  const [bearing, setBearing] = useState(String(view.bearing ?? 0));
  const [pitch, setPitch] = useState(String(view.pitch ?? 0));
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
    const nextView = parseViewDraft(viewDraftRef.current);
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

  const committedViewKey = useMemo(
    () => buildGisConfiguredViewKey(view),
    [view.bearing, view.center[0], view.center[1], view.pitch, view.zoom],
  );
  committedViewKeyRef.current = committedViewKey;

  useEffect(() => {
    setCenterLng(String(view.center[0]));
    setCenterLat(String(view.center[1]));
    setZoom(String(view.zoom));
    setBearing(String(view.bearing ?? 0));
    setPitch(String(view.pitch ?? 0));
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

  const commitCenter = () => applyViewDraft();

  const commitZoom = () => applyViewDraft();

  const commitBearing = () => applyViewDraft();

  const commitPitch = () => applyViewDraft();

  const captureCurrentView = () => {
    const captured = captureGisMapViewCamera(widget.id);
    if (!captured) return;
    mutateChartConfig((current) => {
      const currentProject = readGisProject(current);
      return writeGisProject(current, {
        view: captured,
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

  return (
    <ChartInspectorSection
      title="GIS 底图"
      hint={GIS_SECTION_HINT}
      data-testid="chart-gis-map-project-panel"
    >
      <div className={INSPECTOR_SECTION_GAP}>
        <div className="grid gap-1.5 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
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
            <InspectorFieldLabel
              label="初始视角"
              hint="修改数值即时同步地图（缩放 0–22）；拖拽地图后点「读取当前视角」写回配置。改视角会关闭球面自转。"
            />
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
              aria-label="中心经度"
              value={centerLng}
              onChange={(e) => {
                setCenterLng(e.target.value);
                patchViewDraft({ centerLng: e.target.value });
              }}
              onBlur={commitCenter}
              onKeyDown={onEnterCommit(commitCenter)}
            />
          </div>
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="中心纬度" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
              aria-label="中心纬度"
              value={centerLat}
              onChange={(e) => {
                setCenterLat(e.target.value);
                patchViewDraft({ centerLat: e.target.value });
              }}
              onBlur={commitCenter}
              onKeyDown={onEnterCommit(commitCenter)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <InspectorFieldLabel label="缩放" />
            <Input
              className={INSPECTOR_CTRL}
              inputMode="decimal"
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
        </div>
      </div>
    </ChartInspectorSection>
  );
}

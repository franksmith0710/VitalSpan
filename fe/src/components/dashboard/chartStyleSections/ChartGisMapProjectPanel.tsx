import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import {
  ChartInspectorSection,
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
} from "@/components/dashboard/inspectorCompact";
import {
  DEFAULT_GIS_GLOBE_VIEW,
  DEFAULT_PMTILES_TILE_SERVICE_ID,
  GIS_ATMOSPHERE_PRESETS,
  GIS_BASEMAP_FLAVORS,
  readGisProject,
  writeGisProject,
  type GisAtmospherePreset,
  type GisBasemapFlavor,
  type GisLabelLang,
} from "@/components/charts/engine/maplibre/gisProject";
import { listTileServices } from "@/lib/tileServices";

const FLAVOR_LABELS: Record<GisBasemapFlavor, string> = {
  light: "浅色",
  dark: "深色",
  grayscale: "灰度",
  white: "留白",
  black: "纯黑",
};

const ATMOSPHERE_LABELS: Record<GisAtmospherePreset, string> = {
  day: "白昼",
  dusk: "黄昏（稀疏星点）",
  "deep-space": "深空星空",
};

export function ChartGisMapProjectPanel() {
  const { cfg, onChange } = useChartInspector();
  const project = readGisProject(cfg);
  const view = project.view ?? DEFAULT_GIS_GLOBE_VIEW;
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

  const patchProject = (patch: Parameters<typeof writeGisProject>[1]) => {
    onChange(writeGisProject(cfg, patch));
  };

  const [centerLng, setCenterLng] = useState(String(view.center[0]));
  const [centerLat, setCenterLat] = useState(String(view.center[1]));
  const [zoom, setZoom] = useState(String(view.zoom));
  const [bearing, setBearing] = useState(String(view.bearing ?? 0));
  const [pitch, setPitch] = useState(String(view.pitch ?? 0));

  useEffect(() => {
    setCenterLng(String(view.center[0]));
    setCenterLat(String(view.center[1]));
    setZoom(String(view.zoom));
    setBearing(String(view.bearing ?? 0));
    setPitch(String(view.pitch ?? 0));
  }, [view.bearing, view.center, view.pitch, view.zoom]);

  useEffect(() => {
    if (tileServicesLoading || enabledTileServices.length === 0) return;
    const currentId = project.tileServiceId;
    if (currentId && enabledTileServices.some((service) => service.id === currentId)) return;
    const preferred =
      enabledTileServices.find((service) => service.id === DEFAULT_PMTILES_TILE_SERVICE_ID) ??
      enabledTileServices[0];
    if (preferred && preferred.id !== currentId) {
      onChange(writeGisProject(cfg, { tileServiceId: preferred.id }));
    }
  }, [cfg, enabledTileServices, onChange, project.tileServiceId, tileServicesLoading]);

  const commitView = (next: {
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
  }) => {
    patchProject({
      view: {
        center: next.center ?? view.center,
        zoom: next.zoom ?? view.zoom,
        bearing: next.bearing ?? view.bearing ?? 0,
        pitch: next.pitch ?? view.pitch ?? 0,
      },
    });
  };

  const applyAtmospherePreset = (preset: GisAtmospherePreset) => {
    patchProject({
      atmospherePreset: preset,
      fog: GIS_ATMOSPHERE_PRESETS[preset],
    });
  };

  return (
    <ChartInspectorSection title="GIS 底图" data-testid="chart-gis-map-project-panel">
      <div className={INSPECTOR_SECTION_GAP}>
        <p className="text-theme-xs text-gray-500">
          GIS 地图使用管理员登记的全球 PMTiles 外部底图。瓦片由运维独立部署（如 Planet Z15）；未登记服务时无法出图。
        </p>

        <div className="grid gap-1.5 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <Label className="text-theme-xs text-gray-500">全球 PMTiles 服务</Label>
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
            <p className="text-theme-xs text-gray-500">正在加载已登记的 PMTiles 服务…</p>
          ) : tileServicesError ? (
            <p className="text-theme-xs text-amber-600 dark:text-amber-400">
              无法加载 PMTiles 服务列表，请确认已登录且后端可用。
            </p>
          ) : enabledTileServices.length === 0 ? (
            <p className="text-theme-xs text-amber-600 dark:text-amber-400">
              尚未登记 PMTiles 外部服务。请联系管理员部署并登记 tileServiceId。
            </p>
          ) : !project.tileServiceId ? (
            <p className="text-theme-xs text-amber-600 dark:text-amber-400">
              请选择已登记的全球底图服务。
            </p>
          ) : null}

          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">底图风格</Label>
            <Select
              value={project.basemapFlavor ?? "light"}
              onValueChange={(basemapFlavor) =>
                patchProject({ basemapFlavor: basemapFlavor as GisBasemapFlavor })
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

          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">标注语言</Label>
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
            <Label className="text-theme-xs text-gray-500">投影</Label>
            <Select
              value={project.projection ?? "mercator"}
              onValueChange={(projection) => {
                if (projection === "globe") {
                  const preset = project.atmospherePreset ?? "day";
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
              <Label className="text-theme-xs text-gray-500">大气预设</Label>
              <Select
                value={project.atmospherePreset ?? "day"}
                onValueChange={(preset) => applyAtmospherePreset(preset as GisAtmospherePreset)}
              >
                <SelectTrigger className={INSPECTOR_CTRL} aria-label="大气预设">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ATMOSPHERE_LABELS) as GisAtmospherePreset[]).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {ATMOSPHERE_LABELS[preset]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-theme-xs text-gray-500">
                深空/黄昏会在球外叠加程序化星场；白昼无星点。
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">中心经度</Label>
            <Input
              className={INSPECTOR_CTRL}
              value={centerLng}
              onChange={(e) => setCenterLng(e.target.value)}
              onBlur={() => {
                const lng = Number(centerLng);
                const lat = Number(centerLat);
                if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                commitView({ center: [lng, lat] });
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">中心纬度</Label>
            <Input
              className={INSPECTOR_CTRL}
              value={centerLat}
              onChange={(e) => setCenterLat(e.target.value)}
              onBlur={() => {
                const lng = Number(centerLng);
                const lat = Number(centerLat);
                if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                commitView({ center: [lng, lat] });
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">缩放</Label>
            <Input
              className={INSPECTOR_CTRL}
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
              onBlur={() => {
                const nextZoom = Number(zoom);
                if (!Number.isFinite(nextZoom)) return;
                commitView({ zoom: nextZoom });
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">旋转°</Label>
            <Input
              className={INSPECTOR_CTRL}
              value={bearing}
              onChange={(e) => setBearing(e.target.value)}
              onBlur={() => {
                const next = Number(bearing);
                if (!Number.isFinite(next)) return;
                commitView({ bearing: next });
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-theme-xs text-gray-500">倾斜°</Label>
            <Input
              className={INSPECTOR_CTRL}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              onBlur={() => {
                const next = Number(pitch);
                if (!Number.isFinite(next)) return;
                commitView({ pitch: Math.max(0, Math.min(85, next)) });
              }}
            />
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
              checked={project.buildings3d === true}
              onCheckedChange={(checked) => patchProject({ buildings3d: checked === true })}
            />
            建筑 3D 挤出（zoom ≥ 13）
          </label>
          {project.projection === "globe" ? (
            <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
              <Checkbox
                checked={project.autoRotate === true}
                onCheckedChange={(checked) => patchProject({ autoRotate: checked === true })}
              />
              球面慢速自转（大屏待机）
            </label>
          ) : null}
        </div>
      </div>
    </ChartInspectorSection>
  );
}

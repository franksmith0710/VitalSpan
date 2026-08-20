import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DEFAULT_GLOBE_FOG,
  DEFAULT_PMTILES_TILE_SERVICE_ID,
  readGisProject,
  writeGisProject,
  type GisLabelLang,
  type GisProjection,
} from "@/components/charts/engine/maplibre/gisProject";
import { listTileServices } from "@/lib/tileServices";

export function ChartGisMapProjectPanel() {
  const { cfg, onChange } = useChartInspector();
  const project = readGisProject(cfg);
  const view = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };
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

  useEffect(() => {
    setCenterLng(String(view.center[0]));
    setCenterLat(String(view.center[1]));
    setZoom(String(view.zoom));
  }, [view.center, view.zoom]);

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

  const commitView = (next: { center?: [number, number]; zoom?: number; pitch?: number }) => {
    patchProject({
      view: {
        center: next.center ?? view.center,
        zoom: next.zoom ?? view.zoom,
        bearing: view.bearing,
        pitch: next.pitch ?? view.pitch,
      },
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
                  patchProject({
                    projection: "globe",
                    fog: project.fog ?? DEFAULT_GLOBE_FOG,
                    view: project.view ?? DEFAULT_GIS_GLOBE_VIEW,
                  });
                  return;
                }
                patchProject({ projection: "mercator", fog: undefined });
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
            {project.projection === "globe" ? (
              <p className="text-theme-xs text-gray-500">
                球面模式使用 MapLibre 原生地球投影与星空大气，底图仍为 Planet Z15 PMTiles（无需 GeoLibre 外链）。
              </p>
            ) : null}
          </div>
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

        <div className="grid gap-1.5">
          <Label className="text-theme-xs text-gray-500">缩放级别</Label>
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
      </div>
    </ChartInspectorSection>
  );
}

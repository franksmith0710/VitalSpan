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
  InspectorSwitchRow,
} from "@/components/dashboard/inspectorCompact";
import {
  readGisProject,
  writeGisProject,
  type GisBasemapId,
  type GisLabelLang,
  type GisProjection,
} from "@/components/charts/engine/maplibre/gisProject";
import { listTileServices } from "@/lib/tileServices";

const OFFLINE_BASEMAP_OPTIONS: { value: Exclude<GisBasemapId, "pmtiles">; label: string }[] = [
  { value: "china-provinces", label: "离线中国省界（默认）" },
  { value: "blank", label: "空白底图" },
];

export function ChartGisMapProjectPanel() {
  const { cfg, onChange } = useChartInspector();
  const project = readGisProject(cfg);
  const view = project.view ?? { center: [104, 35] as [number, number], zoom: 3.2 };
  const useGlobalPmtiles = project.basemap === "pmtiles";
  const { data: tileServices = [] } = useQuery({
    queryKey: ["tile-services"],
    queryFn: listTileServices,
    enabled: useGlobalPmtiles,
    retry: false,
  });

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

  const offlineBasemap: Exclude<GisBasemapId, "pmtiles"> =
    project.basemap === "blank" ? "blank" : "china-provinces";

  return (
    <ChartInspectorSection title="GIS 底图" data-testid="chart-gis-map-project-panel">
      <div className={INSPECTOR_SECTION_GAP}>
        <p className="text-theme-xs text-gray-500">
          默认可直接显示离线省界，无需外部服务。全球高清底图需登记 PMTiles 外部服务（下载完成后配置）。
        </p>

        <div className="grid gap-1.5">
          <Label className="text-theme-xs text-gray-500">默认底图</Label>
          <Select
            value={offlineBasemap}
            disabled={useGlobalPmtiles}
            onValueChange={(basemap) =>
              patchProject({ basemap: basemap as Exclude<GisBasemapId, "pmtiles"> })
            }
          >
            <SelectTrigger className={INSPECTOR_CTRL} aria-label="默认底图">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFLINE_BASEMAP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <InspectorSwitchRow
          label="启用全球 PMTiles 底图（外部服务）"
          checked={useGlobalPmtiles}
          onCheckedChange={(enabled) => {
            if (enabled) {
              patchProject({ basemap: "pmtiles", tileServiceId: project.tileServiceId });
            } else {
              patchProject({ basemap: offlineBasemap, tileServiceId: undefined, projection: "mercator" });
            }
          }}
        />

        {useGlobalPmtiles ? (
          <div className="grid gap-1.5 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
            <Label className="text-theme-xs text-gray-500">全球 PMTiles 服务</Label>
            <Select
              value={project.tileServiceId ?? ""}
              onValueChange={(tileServiceId) => patchProject({ basemap: "pmtiles", tileServiceId })}
            >
              <SelectTrigger className={INSPECTOR_CTRL} aria-label="全球 PMTiles 服务">
                <SelectValue placeholder="选择已登记的全球底图服务" />
              </SelectTrigger>
              <SelectContent>
                {tileServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tileServices.length === 0 ? (
              <p className="text-theme-xs text-amber-600 dark:text-amber-400">
                尚未登记全球 PMTiles 服务；请先部署下载的 planet-z15 文件并登记 tileServiceId。
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
                onValueChange={(projection) => patchProject({ projection: projection as GisProjection })}
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
          </div>
        ) : null}

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

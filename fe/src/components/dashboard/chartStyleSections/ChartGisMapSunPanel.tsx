import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useChartInspector } from "@/components/dashboard/chartInspectorContext";
import { InspectorSliderField } from "@/components/dashboard/deAttrSlider";
import {
  ChartInspectorSection,
  INSPECTOR_CTRL,
  INSPECTOR_SECTION_GAP,
  InspectorFieldLabel,
} from "@/components/dashboard/inspectorCompact";
import { readGisProject, writeGisProject } from "@/components/charts/engine/maplibre/gisProject";
import { resolveGisProjectSun, type GisProjectSun } from "@/components/charts/engine/maplibre/gisProjectSun";
import {
  DEFAULT_GIS_SUN_ANIMATION_SPEED,
  DEFAULT_GIS_SUN_DATE,
  DEFAULT_GIS_SUN_NIGHT_SHADOW,
  DEFAULT_GIS_SUN_TIME_MINUTES,
  formatSunTimeLabel,
  parseSunTimeInput,
} from "@/components/charts/engine/maplibre/gisSunLight";
import { applyGisMapSun } from "@/components/charts/engine/maplibre/gisMapViewBridge";

const SUN_HINT = "对标 GeoLibre「太阳」：驱动 MapLibre 光照与 3D 挤出阴影方向。";

export function ChartGisMapSunPanel() {
  const { cfg, widget, mutateChartConfig } = useChartInspector();
  const project = readGisProject(cfg);
  const resolved = useMemo(() => resolveGisProjectSun(project.sun), [project.sun]);
  const [playing, setPlaying] = useState(false);
  const [draftTime, setDraftTime] = useState(formatSunTimeLabel(resolved.timeMinutes));
  const [timelineMinutes, setTimelineMinutes] = useState(resolved.timeMinutes);
  const liveMinutesRef = useRef(resolved.timeMinutes);

  useEffect(() => {
    liveMinutesRef.current = resolved.timeMinutes;
    setDraftTime(formatSunTimeLabel(resolved.timeMinutes));
    setTimelineMinutes(resolved.timeMinutes);
  }, [resolved.timeMinutes]);

  const patchSun = useCallback(
    (patch: GisProjectSun) => {
      mutateChartConfig((current) => {
        const currentProject = readGisProject(current);
        return writeGisProject(current, { sun: { ...currentProject.sun, ...patch } });
      });
    },
    [mutateChartConfig],
  );

  const applyLiveSun = useCallback(
    (timeMinutes: number) => {
      liveMinutesRef.current = timeMinutes;
      applyGisMapSun(widget.id, project.sun, timeMinutes);
    },
    [project.sun, widget.id],
  );

  const commitTimeMinutes = useCallback(
    (timeMinutes: number) => {
      const normalized = ((timeMinutes % 1440) + 1440) % 1440;
      liveMinutesRef.current = normalized;
      setTimelineMinutes(normalized);
      applyLiveSun(normalized);
      patchSun({ timeMinutes: normalized });
      setDraftTime(formatSunTimeLabel(normalized));
    },
    [applyLiveSun, patchSun],
  );

  useEffect(() => {
    if (!playing || project.projection !== "globe" || !resolved.enabled) return;
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const deltaSec = Math.min((now - last) / 1000, 0.1);
      last = now;
      let next = liveMinutesRef.current + resolved.animationSpeed * deltaSec;
      if (next >= 1440) {
        next = resolved.loop ? next % 1440 : 1439;
        if (!resolved.loop) setPlaying(false);
      }
      liveMinutesRef.current = next;
      setTimelineMinutes(next);
      setDraftTime(formatSunTimeLabel(next));
      applyLiveSun(next);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    applyLiveSun,
    playing,
    project.projection,
    resolved.animationSpeed,
    resolved.enabled,
    resolved.loop,
  ]);

  if (project.projection !== "globe") {
    return (
      <ChartInspectorSection title="太阳" hint={SUN_HINT} data-testid="chart-gis-map-sun-panel">
        <p className="text-theme-xs text-gray-500">请先将投影设为「球面地球」。</p>
      </ChartInspectorSection>
    );
  }

  return (
    <ChartInspectorSection title="太阳" hint={SUN_HINT} data-testid="chart-gis-map-sun-panel">
      <div className={INSPECTOR_SECTION_GAP}>
        <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
          <Checkbox
            checked={resolved.enabled}
            onCheckedChange={(checked) => patchSun({ enabled: checked === true })}
          />
          启用太阳光照
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <InspectorFieldLabel label="日期" />
            <Input
              className={INSPECTOR_CTRL}
              type="date"
              value={resolved.date}
              onChange={(event) => patchSun({ date: event.target.value || DEFAULT_GIS_SUN_DATE })}
              aria-label="日期"
            />
          </div>
          <div className="grid gap-1">
            <InspectorFieldLabel label="时间" />
            <Input
              className={INSPECTOR_CTRL}
              value={draftTime}
              onChange={(event) => setDraftTime(event.target.value)}
              onBlur={() => {
                const parsed = parseSunTimeInput(draftTime);
                if (parsed != null) commitTimeMinutes(parsed);
                else setDraftTime(formatSunTimeLabel(resolved.timeMinutes));
              }}
              aria-label="时间"
            />
          </div>
        </div>
        <InspectorSliderField
          label="日弧时间轴"
          hint="06:00 东升 → 18:00 西落"
          value={timelineMinutes}
          min={0}
          max={1439}
          step={1}
          onChange={commitTimeMinutes}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-gray-200 p-1 text-gray-600 hover:text-brand-500 dark:border-gray-700"
            aria-label="后退 30 分钟"
            onClick={() => commitTimeMinutes(resolved.timeMinutes - 30)}
          >
            <SkipBack className="size-4" />
          </button>
          <button
            type="button"
            className="rounded border border-brand-500/40 bg-brand-500/10 p-1 text-brand-500"
            aria-label={playing ? "暂停" : "播放"}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            className="rounded border border-gray-200 p-1 text-gray-600 hover:text-brand-500 dark:border-gray-700"
            aria-label="前进 30 分钟"
            onClick={() => commitTimeMinutes(resolved.timeMinutes + 30)}
          >
            <SkipForward className="size-4" />
          </button>
          <button
            type="button"
            className={`rounded border p-1 ${resolved.loop ? "border-brand-500/40 text-brand-500" : "border-gray-200 text-gray-600 dark:border-gray-700"}`}
            aria-label="循环"
            onClick={() => patchSun({ loop: !resolved.loop })}
          >
            <Repeat className="size-4" />
          </button>
          <button
            type="button"
            className="ml-auto text-[10px] text-brand-500 hover:underline"
            onClick={() => {
              const now = new Date();
              commitTimeMinutes(now.getHours() * 60 + now.getMinutes());
            }}
          >
            当前
          </button>
        </div>
        <InspectorSliderField
          label="动画速度"
          value={Math.round(resolved.animationSpeed)}
          min={1}
          max={600}
          step={1}
          unit="min/s"
          onChange={(animationSpeed) => patchSun({ animationSpeed })}
        />
        <InspectorSliderField
          label="夜间阴影"
          value={Math.round(resolved.nightShadow * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(next) => patchSun({ nightShadow: next / 100 })}
        />
        <p className="text-[10px] text-gray-400">
          默认 {DEFAULT_GIS_SUN_DATE} · {formatSunTimeLabel(DEFAULT_GIS_SUN_TIME_MINUTES)} ·{" "}
          {DEFAULT_GIS_SUN_ANIMATION_SPEED} min/s · 阴影{" "}
          {Math.round(DEFAULT_GIS_SUN_NIGHT_SHADOW * 100)}%
        </p>
      </div>
    </ChartInspectorSection>
  );
}

import * as d3 from "d3";
import {
  formatGeoTooltipValue,
  getOfflineGeoMap,
  joinOfflineMapFeatures,
} from "@/components/charts/engine/geo/OfflineGeoPort";
import { resolveEmbeddedGeoRoam } from "@/components/charts/engine/geo/geoConstants";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";
import { createTooltipLayer, hideTooltip, showMergedTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import { applyDepthHoverLift, ensureDepthShadowFilter, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import type { D3GeoRenderConfig } from "@/components/charts/engine/d3/types";

function geoSurfaceColors(isDark: boolean) {
  return {
    emptyFill: isDark ? "#334155" : "#e8edf3",
    border: isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.55)",
    rangeLow: isDark ? "#0c4a6e" : "#e0f2fe",
    rangeHigh: isDark ? "#38bdf8" : "#1653a9",
  };
}

function colorForValue(
  value: number,
  min: number,
  max: number,
  surface: ReturnType<typeof geoSurfaceColors>,
): string {
  if (!Number.isFinite(value) || value <= 0) return surface.emptyFill;
  if (max <= 0) return surface.emptyFill;
  const t = max <= min ? 1 : (value - min) / (max - min);
  return d3.interpolateRgb(surface.rangeLow, surface.rangeHigh)(Math.max(0, Math.min(1, t)));
}

export function renderD3ChoroplethChart(container: HTMLElement, config: D3GeoRenderConfig): () => void {
  const {
    width,
    height,
    rows,
    columns,
    regionField,
    metricField,
    theme,
    showTooltip,
    tooltipPresentation,
    valueFormat,
    knownRegionNames,
    mapId = VS_REGIONS_MAP_ID,
    isDark = false,
    geoStyle = {},
    onPointClick,
    depthVisual,
  } = config;

  const depthLevel = resolveEffectiveDepth(depthVisual);

  const roam = resolveEmbeddedGeoRoam(geoStyle.roam);
  const showRegionLabel = geoStyle.showRegionLabel === true;
  const showVisualMap = geoStyle.visualMap !== false;

  if (width <= 0 || height <= 0) {
    container.replaceChildren();
    return () => undefined;
  }

  const geo = getOfflineGeoMap(mapId);
  if (!geo?.features?.length) {
    container.replaceChildren();
    const msg = document.createElement("div");
    msg.className =
      "flex h-full items-center justify-center px-3 text-center text-theme-sm text-error-600 dark:text-error-400";
    msg.setAttribute("role", "alert");
    msg.textContent = "离线地图资产缺失，无法渲染";
    container.appendChild(msg);
    return () => container.replaceChildren();
  }

  const features = joinOfflineMapFeatures(
    rows,
    columns,
    regionField,
    metricField,
    mapId,
    knownRegionNames,
  ).filter((f) => f.geometry != null);
  if (features.length === 0) {
    container.replaceChildren();
    const msg = document.createElement("div");
    msg.className =
      "flex h-full items-center justify-center px-3 text-center text-theme-sm text-warning-600 dark:text-warning-400";
    msg.setAttribute("role", "status");
    msg.textContent = "无有效地图区域可渲染，请检查地区维度与数据";
    container.appendChild(msg);
    return () => container.replaceChildren();
  }

  container.replaceChildren();

  const surface = geoSurfaceColors(isDark);
  const margin = { top: 8, right: 12, bottom: 24, left: 12 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const featureCollection = {
    type: "FeatureCollection" as const,
    features: features.map((f) => ({ type: "Feature" as const, properties: { name: f.name }, geometry: f.geometry! })),
  };
  const projection = d3.geoMercator().fitSize([innerW, innerH], featureCollection);
  const pathGen = d3.geoPath().projection(projection);

  const positiveValues = features.map((f) => f.value).filter((v) => v > 0);
  const maxVal = positiveValues.length ? (d3.max(positiveValues) ?? 0) : 0;
  const minVal = positiveValues.length ? (d3.min(positiveValues) ?? 0) : 0;

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .style("display", "block")
    .style("overflow", "visible");

  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const mapLayer = g.append("g").attr("class", "map-layer");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const regionShadowId =
    depthLevel === "enhanced" ? ensureDepthShadowFilter(root.append("defs"), "choropleth", depthLevel) : null;

  mapLayer
    .selectAll("path.region")
    .data(features)
    .join("path")
    .attr("class", "region")
    .attr("d", (d) => pathGen({ type: "Feature", properties: {}, geometry: d.geometry! }) ?? "")
    .attr("fill", (d) => colorForValue(d.value, minVal, maxVal, surface))
    .attr("stroke", surface.border)
    .attr("stroke-width", 0.8)
    .attr("filter", regionShadowId ? `url(#${regionShadowId})` : null)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .on("mouseenter", function (_event, d) {
      const sel = d3.select(this);
      sel.transition().duration(120).attr("stroke-width", 1.6);
      applyDepthHoverLift(sel);
      if (!tooltip) return;
      showMergedTooltip(
        tooltip,
        container,
        _event,
        d.name,
        [{ name: metricField || "值", color: surface.rangeHigh, value: d.value }],
        valueFormat,
        width,
      );
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      showMergedTooltip(
        tooltip,
        container,
        event,
        d.name,
        [{ name: metricField || "值", color: surface.rangeHigh, value: d.value }],
        valueFormat,
        width,
      );
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke-width", 0.8).attr("transform", null).attr("opacity", 1);
      hideTooltip(tooltip);
    })
    .on("click", (_event, d) => onPointClick?.({ name: d.name, value: d.value, adcode: d.adcode }));

  if (showRegionLabel) {
    mapLayer
      .selectAll("text.region-label")
      .data(features)
      .join("text")
      .attr("class", "region-label")
      .attr("transform", (d) => {
        const centroid = pathGen.centroid({ type: "Feature", properties: {}, geometry: d.geometry! });
        return `translate(${centroid[0]},${centroid[1]})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", resolveLabelFill(theme))
      .style("font-size", "9px")
      .style("pointer-events", "none")
      .text((d) => d.name);
  }

  if (showVisualMap) {
    const legendW = 100;
    const legendH = 8;
    const legendX = width - margin.right - legendW;
    const legendY = height - margin.bottom + 4;
    const legendG = root.append("g").attr("transform", `translate(${legendX},${legendY})`);
    const defs = root.append("defs");
    const gradId = `d3-choropleth-legend-${Math.random().toString(36).slice(2, 9)}`;
    const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("x2", "100%");
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorForValue(minVal + t * (maxVal - minVal || 1), minVal, maxVal, surface));
    }
    legendG.append("rect").attr("width", legendW).attr("height", legendH).attr("rx", 2).attr("fill", `url(#${gradId})`);
    legendG
      .append("text")
      .attr("y", legendH + 12)
      .attr("fill", theme.axisLabel)
      .style("font-size", "10px")
      .text(formatGeoTooltipValue(minVal, valueFormat));
    legendG
      .append("text")
      .attr("x", legendW)
      .attr("y", legendH + 12)
      .attr("text-anchor", "end")
      .attr("fill", theme.axisLabel)
      .style("font-size", "10px")
      .text(formatGeoTooltipValue(maxVal, valueFormat));
  }

  let detachZoom = () => undefined;
  if (roam) {
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => {
        mapLayer.attr("transform", event.transform.toString());
      });
    root.call(zoom);
    root.on("dblclick.zoom", () => {
      root.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });
    detachZoom = () => {
      root.on(".zoom", null);
      root.on("dblclick.zoom", null);
    };
  }

  return () => {
    detachZoom();
    container.replaceChildren();
  };
}

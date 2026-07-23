import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { applyCellBevel, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { staggerDelay } from "@/components/charts/engine/d3/core/motionEngine";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type WordDatum = { word: string; weight: number };

type PlacedWord = WordDatum & {
  x: number;
  y: number;
  fontSize: number;
  w: number;
  h: number;
  rotate: number;
};

function overlaps(a: PlacedWord, x: number, y: number, w: number, h: number, pad = 2): boolean {
  return !(
    x + w + pad < a.x ||
    x > a.x + a.w + pad ||
    y + h + pad < a.y ||
    y > a.y + a.h + pad
  );
}

function measureText(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  word: string,
  fontSize: number,
  rotate: number,
): { w: number; h: number } {
  const probe = svg
    .append("text")
    .attr("visibility", "hidden")
    .style("font-size", `${fontSize}px`)
    .style("font-family", "inherit")
    .attr("transform", rotate ? `rotate(${rotate})` : null)
    .text(word);
  const box = (probe.node() as SVGTextElement).getBBox();
  probe.remove();
  return { w: box.width, h: box.height };
}

function placeWords(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  words: WordDatum[],
  width: number,
  height: number,
  fontMin: number,
  fontMax: number,
  spacing: number,
): PlacedWord[] {
  const weights = words.map((d) => d.weight);
  const sizeScale = d3
    .scaleLinear()
    .domain([d3.min(weights) ?? 0, d3.max(weights) ?? 1])
    .range([fontMin, fontMax])
    .clamp(true);

  const sorted = [...words].sort((a, b) => b.weight - a.weight);
  const placed: PlacedWord[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const rotations = VCDS.wordCloud.rotationAngles;

  for (const item of sorted) {
    const fontSize = sizeScale(item.weight);
    let found = false;

    for (let step = 0; step < 1600 && !found; step += 1) {
      const angle = step * 0.32;
      const radius = step * 0.55;
      const rotate = rotations[step % rotations.length] ?? 0;
      const { w, h } = measureText(svg, item.word, fontSize, rotate);
      const x = cx + radius * Math.cos(angle) - w / 2;
      const y = cy + radius * Math.sin(angle) - h / 2;
      const inBounds = x >= 2 && y >= 2 && x + w <= width - 2 && y + h <= height - 2;
      const hit = placed.some((p) => overlaps(p, x, y, w, h, spacing));
      if (inBounds && !hit) {
        placed.push({ ...item, x, y, fontSize, w, h, rotate });
        found = true;
      }
    }
  }

  return placed;
}

function positionTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  event: MouseEvent,
  container: HTMLElement,
  width: number,
) {
  const rect = container.getBoundingClientRect();
  tooltip
    .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
    .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
}

export function renderD3WordCloudChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showTooltip, valueFormat, options, onPointClick, depthVisual } = config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const data = (options.data as WordDatum[]) ?? [];
  const fontMin = Number(options.__wordCloudFontMin ?? VCDS.wordCloud.minFontSize);
  const fontMax = Number(options.__wordCloudFontMax ?? Math.min(48, width / 8));
  const spacing = Number(options.__wordCloudSpacing ?? 2);
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const placed = placeWords(svg, data, width, height, fontMin, fontMax, spacing);
  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(placed.map((d) => d.word))
    .range(colors);

  const tooltip = showTooltip ? createTooltip(container, theme, config.tooltipPresentation) : null;
  const cells = svg
    .selectAll<SVGGElement, PlacedWord>("g.word-cell")
    .data(placed)
    .join("g")
    .attr("class", "word-cell")
    .attr("transform", (d) => `translate(${d.x + d.w / 2},${d.y + d.h / 2})`)
    .style("cursor", onPointClick ? "pointer" : "default");

  if (!prefersReducedMotion()) {
    cells
      .attr("opacity", 0)
      .transition()
      .delay((_d, i) => staggerDelay(i))
      .duration(motionDuration("enter"))
      .attr("opacity", 1);
  }

  cells
    .append("rect")
    .attr("x", (d) => -d.w / 2)
    .attr("y", (d) => -d.h / 2)
    .attr("width", (d) => d.w)
    .attr("height", (d) => d.h)
    .attr("rx", 2)
    .attr("fill", (d) => colorScale(d.word) ?? colors[0] ?? theme.accent)
    .attr("opacity", 0.12)
    .each(function () {
      applyCellBevel(d3.select(this), depthLevel);
    });

  cells
    .append("text")
    .attr("class", "word")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", (d) => colorScale(d.word) ?? colors[0] ?? theme.accent)
    .style("font-size", (d) => `${d.fontSize}px`)
    .style("font-family", "inherit")
    .style("pointer-events", "none")
    .attr("transform", (d) => (d.rotate ? `rotate(${d.rotate})` : null))
    .text((d) => d.word);

  if (!prefersReducedMotion()) {
    cells
      .select("text")
      .attr("transform", (d) => `${d.rotate ? `rotate(${d.rotate}) ` : ""}scale(0)`)
      .transition()
      .delay((_d, i) => staggerDelay(i))
      .duration(motionDuration("enter"))
      .attr("transform", (d) => (d.rotate ? `rotate(${d.rotate})` : null));
  }

  cells
    .on("mouseenter", function () {
      d3.select(this).select("text").attr("opacity", 0.75);
    })
    .on("mouseleave", function () {
      d3.select(this).select("text").attr("opacity", 1);
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      tooltip
        .style("opacity", "1")
        .html(
          `<div style="font-weight:600;margin-bottom:2px">${d.word}</div>` +
            `<div><strong>${formatChartValue(d.weight, valueFormat)}</strong></div>`,
        );
      positionTooltip(tooltip, event, container, width);
    })
    .on("mouseout", () => tooltip?.style("opacity", "0"))
    .on("click", (_event, d) => onPointClick?.({ word: d.word, weight: d.weight } as D3Datum));

  return () => container.replaceChildren();
}

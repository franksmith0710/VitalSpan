import { morphNumber } from "@/components/charts/engine/d3/core/motionEngine";
import { getDepthVisual } from "@/components/charts/engine/d3/core/depthEngine";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import { formatChartValue } from "@/lib/chartValueFormat";

type KpiMetric = {
  field: string;
  label?: string | null;
  sparkValues?: number[];
  yoy?: number | null;
  mom?: number | null;
};

function metricLabel(metric: KpiMetric): string {
  return metric.label?.trim() || metric.field;
}

function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveSparkValues(metric: KpiMetric, options: Record<string, unknown>, row: unknown[], columns: string[]): number[] {
  if (Array.isArray(metric.sparkValues) && metric.sparkValues.length > 1) {
    return metric.sparkValues.filter((v) => Number.isFinite(v));
  }
  const trendKey = `${metric.field}Trend`;
  const fromRow = columns.indexOf(trendKey);
  if (fromRow >= 0 && Array.isArray(row[fromRow])) {
    return (row[fromRow] as unknown[]).map(Number).filter(Number.isFinite);
  }
  const globalSpark = options.sparkValues ?? options.trend;
  if (Array.isArray(globalSpark) && globalSpark.length > 1) {
    return globalSpark.map(Number).filter(Number.isFinite);
  }
  return [];
}

function resolveComparison(
  metric: KpiMetric,
  kind: "yoy" | "mom",
  columns: string[],
  row: unknown[],
): number | null {
  const direct = metric[kind];
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);
  const col = columns.indexOf(`${metric.field}_${kind}`);
  if (col >= 0) return parseNumeric(row[col]);
  const alt = columns.indexOf(kind);
  if (alt >= 0) return parseNumeric(row[alt]);
  return null;
}

function comparisonColor(delta: number): string {
  if (delta > 0) return "var(--color-success-500, #12b76a)";
  if (delta < 0) return "var(--color-error-500, #f04438)";
  return "var(--color-gray-400, #98a2b3)";
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

function appendSparkline(card: HTMLElement, values: number[], color: string): void {
  const w = 72;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("mt-2", "opacity-80");

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", color);
  poly.setAttribute("stroke-width", "1.5");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  poly.setAttribute("points", pts);
  svg.append(poly);
  card.append(svg);
}

function appendComparisonStrip(card: HTMLElement, yoy: number | null, mom: number | null): void {
  if (yoy == null && mom == null) return;
  const strip = document.createElement("div");
  strip.className = "mt-2 flex flex-wrap gap-2 text-theme-xs";

  for (const [label, delta] of [
    ["同比", yoy],
    ["环比", mom],
  ] as const) {
    if (delta == null) continue;
    const chip = document.createElement("span");
    chip.className = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 tabular-nums";
    chip.style.background = `color-mix(in srgb, ${comparisonColor(delta)} 12%, transparent)`;
    chip.style.color = comparisonColor(delta);
    chip.textContent = `${label} ${formatDelta(delta)}`;
    strip.append(chip);
  }

  card.append(strip);
}

export function renderD3KpiChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { theme: rawTheme, valueFormat, options } = config;
  const theme = themeFromConfig(rawTheme);
  const metrics = (options.metrics as KpiMetric[] | undefined) ?? [];
  const rows = (options.rows as unknown[][] | undefined) ?? [];
  const columns = (options.columns as string[] | undefined) ?? [];
  const row = rows[0] ?? [];

  const root = document.createElement("div");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "指标卡");
  root.className = "vs-kpi-chart flex h-full min-h-0 flex-col justify-center overflow-auto p-4";
  const kpiFontSize = Number(options.__kpiFontSize ?? 28);
  const kpiAlign = String(options.__kpiAlign ?? "center") as "left" | "center" | "right";
  root.style.textAlign = kpiAlign;
  const depthVisual = getDepthVisual();
  if (depthVisual === "enhanced") root.classList.add("vs-kpi-depth-enhanced");
  else if (depthVisual === "standard") root.classList.add("vs-kpi-depth-standard");
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.boxSizing = "border-box";

  if (metrics.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-theme-sm text-center";
    empty.style.color = theme.axisLabel;
    empty.textContent = "暂无指标数据，请配置度量字段";
    root.append(empty);
    container.append(root);
    return () => container.replaceChildren();
  }

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";
  const cleanups: (() => void)[] = [];

  for (const metric of metrics) {
    const idx = columns.indexOf(metric.field);
    const raw = idx >= 0 ? row[idx] : undefined;
    const numeric = parseNumeric(raw);
    const spark = resolveSparkValues(metric, options, row, columns);
    const yoy = resolveComparison(metric, "yoy", columns, row);
    const mom = resolveComparison(metric, "mom", columns, row);

    const card = document.createElement("div");
    card.className =
      "min-h-[80px] rounded-xl border bg-[var(--dashboard-widget-surface,transparent)] p-4 shadow-theme-xs transition-shadow hover:shadow-theme-sm";
    card.style.borderColor = theme.gridLine;

    const label = document.createElement("p");
    label.className = "line-clamp-2 text-theme-sm";
    label.style.color = theme.axisLabel;
    label.textContent = metricLabel(metric);

    const valueEl = document.createElement("p");
    valueEl.className = "mt-1 font-semibold tabular-nums tracking-tight";
    valueEl.style.fontSize = `${kpiFontSize}px`;
    valueEl.style.color = theme.legendText;

    if (numeric == null && raw == null) {
      valueEl.textContent = "—";
      valueEl.style.opacity = "0.55";
    } else {
      valueEl.textContent = formatChartValue(raw, valueFormat);
      if (numeric != null) {
        valueEl.textContent = formatChartValue(0, valueFormat);
        cleanups.push(
          morphNumber(0, numeric, (v) => {
            valueEl.textContent = formatChartValue(v, valueFormat);
          }),
        );
      }
    }

    card.append(label, valueEl);
    if (spark.length > 1) appendSparkline(card, spark, theme.accent);
    appendComparisonStrip(card, yoy, mom);
    grid.append(card);
  }

  root.append(grid);
  container.append(root);

  return () => {
    cleanups.forEach((fn) => fn());
    container.replaceChildren();
  };
}

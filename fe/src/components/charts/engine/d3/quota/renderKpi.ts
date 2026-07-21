import { morphNumber } from "@/components/charts/engine/d3/core/motionEngine";
import { getDepthVisual } from "@/components/charts/engine/d3/core/depthEngine";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import { formatChartValue } from "@/lib/chartValueFormat";

type KpiMetric = { field: string; label?: string | null };

function metricLabel(metric: KpiMetric): string {
  return metric.label?.trim() || metric.field;
}

function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
  const depthVisual = getDepthVisual();
  if (depthVisual === "enhanced") root.classList.add("vs-kpi-depth-enhanced");
  else if (depthVisual === "standard") root.classList.add("vs-kpi-depth-standard");
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.boxSizing = "border-box";

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";

  const cleanups: (() => void)[] = [];

  for (const metric of metrics) {
    const idx = columns.indexOf(metric.field);
    const raw = idx >= 0 ? row[idx] : undefined;
    const numeric = parseNumeric(raw);

    const card = document.createElement("div");
    card.className =
      "min-h-[80px] rounded-xl border bg-[var(--dashboard-widget-surface,transparent)] p-4 shadow-theme-xs transition-shadow hover:shadow-theme-sm";
    card.style.borderColor = theme.gridLine;

    const label = document.createElement("p");
    label.className = "line-clamp-2 text-theme-sm";
    label.style.color = theme.axisLabel;
    label.textContent = metricLabel(metric);

    const valueEl = document.createElement("p");
    valueEl.className = "mt-1 text-2xl font-semibold tabular-nums tracking-tight";
    valueEl.style.color = theme.legendText;
    valueEl.textContent = formatChartValue(raw, valueFormat);

    if (numeric != null) {
      valueEl.textContent = formatChartValue(0, valueFormat);
      cleanups.push(
        morphNumber(0, numeric, (v) => {
          valueEl.textContent = formatChartValue(v, valueFormat);
        }),
      );
    }

    card.append(label, valueEl);
    grid.append(card);
  }

  root.append(grid);
  container.append(root);

  return () => {
    cleanups.forEach((fn) => fn());
    container.replaceChildren();
  };
}

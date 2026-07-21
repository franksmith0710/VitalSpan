import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type KpiMetric = { field: string; label?: string | null };

function metricLabel(metric: KpiMetric): string {
  return metric.label?.trim() || metric.field;
}

export function renderD3KpiChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { theme, valueFormat, options } = config;
  const metrics = (options.metrics as KpiMetric[] | undefined) ?? [];
  const rows = (options.rows as unknown[][] | undefined) ?? [];
  const columns = (options.columns as string[] | undefined) ?? [];
  const row = rows[0] ?? [];

  const root = document.createElement("div");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "指标卡");
  root.className = "flex h-full min-h-0 flex-col justify-center overflow-auto p-3";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.boxSizing = "border-box";

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";

  for (const metric of metrics) {
    const idx = columns.indexOf(metric.field);
    const value = idx >= 0 ? row[idx] : undefined;

    const card = document.createElement("div");
    card.className = "min-h-[72px] rounded-lg border p-3";
    card.style.borderColor = theme.gridLine;

    const label = document.createElement("p");
    label.className = "line-clamp-2 text-theme-sm";
    label.style.color = theme.axisLabel;
    label.textContent = metricLabel(metric);

    const valueEl = document.createElement("p");
    valueEl.className = "text-theme-sm font-semibold tabular-nums";
    valueEl.style.color = theme.legendText;
    valueEl.textContent = formatChartValue(value, valueFormat);

    card.append(label, valueEl);
    grid.append(card);
  }

  root.append(grid);
  container.append(root);

  return () => {
    container.replaceChildren();
  };
}

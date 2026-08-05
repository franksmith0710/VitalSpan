import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartLabelStyle } from "@/lib/chartDeStyle";
import { formatChartValue } from "@/lib/chartValueFormat";

export type PieLabelRenderOptions = {
  position: "inside" | "outside";
  showDimension: boolean;
  showIndicator: boolean;
  showPercent: boolean;
  percentDecimals: number;
};

export function resolvePieLabelRenderOptions(
  label: ChartLabelStyle | undefined,
): PieLabelRenderOptions {
  const position = label?.position === "outside" ? "outside" : "inside";
  const outside = position === "outside";
  return {
    position,
    showDimension: label?.showDimension ?? outside,
    showIndicator: label?.showIndicator !== false,
    showPercent: label?.showPercent ?? outside,
    percentDecimals: label?.percentDecimals ?? label?.ratioDecimals ?? 2,
  };
}

export function formatPieSliceLabel(
  row: Record<string, unknown>,
  colorField: string,
  angleField: string,
  total: number,
  opts: PieLabelRenderOptions,
  valueFormat: NumberFormatConfig | undefined,
): string {
  const dim =
    opts.showDimension ? String(row[colorField] ?? "").trim() : "";
  const indicator =
    opts.showIndicator ? formatChartValue(row[angleField], valueFormat) : "";
  const v = Number(row[angleField] ?? 0);
  const pct = total > 0 ? (v / total) * 100 : 0;
  const percent =
    opts.showPercent ? `${pct.toFixed(opts.percentDecimals)}%` : "";

  if (opts.position === "outside") {
    let text = dim;
    if (indicator) text = text ? `${text} ${indicator}` : indicator;
    if (percent) text = text ? `${text} (${percent})` : percent;
    return text;
  }

  const parts: string[] = [];
  if (dim) parts.push(dim);
  if (indicator) parts.push(indicator);
  if (percent) parts.push(percent);
  return parts.join("\n");
}

/** Tooltip 行：数值 (占比%)，对标 DE total_amount: 14,998 (6.28%) */
export function formatPieTooltipValue(
  value: unknown,
  total: number,
  valueFormat: NumberFormatConfig | undefined,
  percentDecimals = 2,
): string {
  const indicator = formatChartValue(value, valueFormat);
  const n = Number(value ?? 0);
  const pct = total > 0 ? (n / total) * 100 : 0;
  return `${indicator} (${pct.toFixed(percentDecimals)}%)`;
}

/** 外置标签：径向段 + 水平段（对标 DE / ECharts labelLine） */
export type PieOutsideLabelGeometry = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  textX: number;
  textY: number;
  anchor: "start" | "end";
  isRight: boolean;
};

export function pieOutsideLabelPolyline(geo: PieOutsideLabelGeometry): string {
  const { x0, y0, x1, y1, x2, textY } = geo;
  if (Math.abs(y1 - textY) < 0.5) {
    return `${x0},${y0} ${x1},${y1} ${x2},${y1}`;
  }
  return `${x0},${y0} ${x1},${y1} ${x2},${y1} ${x2},${textY}`;
}

export function pieOutsideLabelGeometry(
  midAngle: number,
  outerR: number,
  radialLen?: number,
): PieOutsideLabelGeometry {
  const rLen = radialLen ?? Math.max(5, outerR * 0.04);
  const cos = Math.cos(midAngle - Math.PI / 2);
  const sin = Math.sin(midAngle - Math.PI / 2);
  const isRight = cos >= 0;
  const x0 = cos * outerR;
  const y0 = sin * outerR;
  const x1 = cos * (outerR + rLen);
  const y1 = sin * (outerR + rLen);
  const stub = outsideLabelColumnStub(outerR);
  const x2 = isRight ? x1 + stub : x1 - stub;
  const textX = isRight ? x2 + OUTSIDE_LABEL_TEXT_GAP : x2 - OUTSIDE_LABEL_TEXT_GAP;
  return {
    x0,
    y0,
    x1,
    y1,
    x2,
    textX,
    textY: y1,
    anchor: isRight ? "start" : "end",
    isRight,
  };
}

export type PieOutsideLabelCandidate = {
  key: string;
  midAngle: number;
  sliceAngle: number;
  text: string;
};

export type PieOutsideLabelPlaced = {
  visible: boolean;
  text: string;
  points: string;
  textX: number;
  textY: number;
  anchor: "start" | "end";
};

const MIN_SLICE_ANGLE_RAD = 0.035;
const OUTSIDE_LABEL_TEXT_GAP = 3;

function outsideLabelColumnStub(outerR: number): number {
  return Math.max(8, outerR * 0.045);
}

/** 同侧标签共用垂直引线列，水平段对齐（对标 DE / ECharts labelLine） */
function alignOutsideLabelColumns(items: { geo: PieOutsideLabelGeometry }[], outerR: number): void {
  const stub = outsideLabelColumnStub(outerR);
  const right = items.filter((i) => i.geo.isRight);
  const left = items.filter((i) => !i.geo.isRight);

  if (right.length > 0) {
    const columnX = Math.max(...right.map((i) => i.geo.x1)) + stub;
    for (const item of right) {
      item.geo.x2 = columnX;
      item.geo.textX = columnX + OUTSIDE_LABEL_TEXT_GAP;
      item.geo.anchor = "start";
    }
  }
  if (left.length > 0) {
    const columnX = Math.min(...left.map((i) => i.geo.x1)) - stub;
    for (const item of left) {
      item.geo.x2 = columnX;
      item.geo.textX = columnX - OUTSIDE_LABEL_TEXT_GAP;
      item.geo.anchor = "end";
    }
  }
}

function layoutHalf(
  items: { geo: PieOutsideLabelGeometry }[],
  bound: number,
  gap: number,
  mode: "up" | "down",
): number {
  if (items.length === 0) return 0;
  items.sort((a, b) => a.geo.textY - b.geo.textY);
  if (mode === "down") {
    for (let i = 1; i < items.length; i++) {
      const minY = items[i - 1].geo.textY + gap;
      if (items[i].geo.textY < minY) items[i].geo.textY = minY;
    }
    const overflow = items[items.length - 1].geo.textY - bound;
    return overflow > 0 ? overflow : 0;
  }
  for (let i = items.length - 2; i >= 0; i--) {
    const maxY = items[i + 1].geo.textY - gap;
    if (items[i].geo.textY > maxY) items[i].geo.textY = maxY;
  }
  const overflow = bound - items[0].geo.textY;
  return overflow > 0 ? overflow : 0;
}

function layoutSide(
  side: { geo: PieOutsideLabelGeometry }[],
  ymin: number,
  ymax: number,
  gap: number,
): number {
  const top = side.filter((i) => i.geo.textY < 0);
  const bottom = side.filter((i) => i.geo.textY >= 0);
  return Math.max(
    layoutHalf(top, ymin, gap, "up"),
    layoutHalf(bottom, ymax, gap, "down"),
  );
}

/** 外置标签防碰撞：左右分侧垂直堆叠 + 空间不足时隐藏最小扇区 */
export function layoutPieOutsideLabels(
  candidates: PieOutsideLabelCandidate[],
  outerR: number,
  fontSize: number,
  bounds: { ymin: number; ymax: number },
): Map<string, PieOutsideLabelPlaced> {
  const gap = Math.max(fontSize * 1.15, 12);
  const { ymin, ymax } = bounds;
  const result = new Map<string, PieOutsideLabelPlaced>();

  type Item = {
    key: string;
    sliceAngle: number;
    midAngle: number;
    text: string;
    visible: boolean;
    geo: PieOutsideLabelGeometry;
  };

  const items: Item[] = [];
  for (const c of candidates) {
    if (c.sliceAngle < MIN_SLICE_ANGLE_RAD) {
      result.set(c.key, {
        visible: false,
        text: c.text,
        points: "",
        textX: 0,
        textY: 0,
        anchor: "start",
      });
      continue;
    }
    items.push({
      key: c.key,
      sliceAngle: c.sliceAngle,
      midAngle: c.midAngle,
      text: c.text,
      visible: true,
      geo: pieOutsideLabelGeometry(c.midAngle, outerR),
    });
  }

  const resetYs = () => {
    for (const item of items) {
      const fresh = pieOutsideLabelGeometry(item.midAngle, outerR);
      item.geo.textY = fresh.textY;
    }
  };

  const fitVisible = () => {
    const visible = items.filter((i) => i.visible);
    return Math.max(
      layoutSide(visible.filter((i) => i.geo.isRight), ymin, ymax, gap),
      layoutSide(visible.filter((i) => !i.geo.isRight), ymin, ymax, gap),
    );
  };

  resetYs();
  let guard = items.length + 4;
  while (guard > 0) {
    const overflow = fitVisible();
    if (overflow <= 0) break;
    guard -= 1;
    const hide = items
      .filter((i) => i.visible)
      .sort((a, b) => a.sliceAngle - b.sliceAngle)[0];
    if (!hide) break;
    hide.visible = false;
    resetYs();
  }

  if (guard <= 0) {
    resetYs();
    fitVisible();
  }

  alignOutsideLabelColumns(items.filter((i) => i.visible), outerR);

  for (const item of items) {
    if (!item.visible) {
      result.set(item.key, {
        visible: false,
        text: item.text,
        points: "",
        textX: 0,
        textY: 0,
        anchor: item.geo.anchor,
      });
      continue;
    }
    result.set(item.key, {
      visible: true,
      text: item.text,
      points: pieOutsideLabelPolyline(item.geo),
      textX: item.geo.textX,
      textY: item.geo.textY,
      anchor: item.geo.anchor,
    });
  }
  return result;
}

export function pieOutsideLabelBounds(outerR: number): { ymin: number; ymax: number } {
  const ymax = outerR * 1.42;
  return { ymin: -ymax, ymax };
}

export function pieArcLayoutKey(startAngle: number, endAngle: number): string {
  return `${startAngle}:${endAngle}`;
}

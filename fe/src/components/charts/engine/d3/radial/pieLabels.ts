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

/** 外置标签几何（沿扇区角度径向分布，对标扇形图） */
export type PieOutsideLabelGeometry = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  textX: number;
  textY: number;
  anchor: "start" | "end" | "middle";
  isRight: boolean;
};

export function pieOutsideLabelPolyline(geo: PieOutsideLabelGeometry): string {
  return `${geo.x0},${geo.y0} ${geo.x1},${geo.y1} ${geo.textX},${geo.textY}`;
}

function outsideLabelRadialOut(outerR: number, fontSize: number): number {
  return Math.max(14, outerR * 0.12, fontSize * 0.85);
}

function estimateLabelPixelWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    width += code > 0xff ? fontSize : fontSize * 0.58;
  }
  return width + OUTSIDE_LABEL_TEXT_GAP;
}

export function pieOutsideLabelGeometry(
  midAngle: number,
  outerR: number,
  fontSize: number,
  connectR?: number,
  text = "",
  radialExtra = 0,
): PieOutsideLabelGeometry {
  const edgeR = connectR ?? outerR;
  const radialOut = outsideLabelRadialOut(outerR, fontSize);
  const cos = Math.cos(midAngle - Math.PI / 2);
  const sin = Math.sin(midAngle - Math.PI / 2);
  const isRight = cos >= 0;
  const absCos = Math.abs(cos);
  const anchor: "start" | "end" | "middle" =
    absCos > 0.25 ? (isRight ? "start" : "end") : "middle";
  const labelR = Math.max(edgeR + 4, outerR + radialOut) + radialExtra;
  const x0 = cos * edgeR;
  const y0 = sin * edgeR;
  const elbowX = cos * labelR;
  const elbowY = sin * labelR;
  const textW = text ? estimateLabelPixelWidth(text, fontSize) : fontSize * 2;
  let textX = elbowX;
  let textY = elbowY;
  if (anchor === "start") {
    textX = elbowX + OUTSIDE_LABEL_TEXT_GAP;
  } else if (anchor === "end") {
    textX = elbowX - OUTSIDE_LABEL_TEXT_GAP;
  } else if (sin > 0.35) {
    textY = elbowY + textW * 0.35;
  } else if (sin < -0.35) {
    textY = elbowY - textW * 0.35;
  }
  return {
    x0,
    y0,
    x1: elbowX,
    y1: elbowY,
    x2: textX,
    textX,
    textY,
    anchor,
    isRight,
  };
}

export type PieOutsideLabelCandidate = {
  key: string;
  midAngle: number;
  sliceAngle: number;
  text: string;
  /** 扇区外缘半径（玫瑰图随数值变化；普通饼图为 outerR） */
  connectR?: number;
  /** 数值越大越优先保留（玫瑰图等大扇区等角时按指标） */
  priority?: number;
};

export type PieOutsideLabelPlaced = {
  visible: boolean;
  text: string;
  points: string;
  textX: number;
  textY: number;
  anchor: "start" | "end" | "middle";
};

const MIN_SLICE_ANGLE_RAD = 0.035;
const OUTSIDE_LABEL_TEXT_GAP = 3;

export function outsideLabelRowGap(fontSize: number): number {
  return Math.max(fontSize + 8, Math.round(fontSize * 1.4));
}

type LabelBBox = { left: number; right: number; top: number; bottom: number };

function labelTextBBox(
  geo: PieOutsideLabelGeometry,
  text: string,
  fontSize: number,
): LabelBBox {
  const w = estimateLabelPixelWidth(text, fontSize);
  const h = fontSize + 4;
  const cy = geo.textY;
  if (geo.anchor === "start") {
    return { left: geo.textX, right: geo.textX + w, top: cy - h / 2, bottom: cy + h / 2 };
  }
  if (geo.anchor === "end") {
    return { left: geo.textX - w, right: geo.textX, top: cy - h / 2, bottom: cy + h / 2 };
  }
  return { left: geo.textX - w / 2, right: geo.textX + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
}

function boxesOverlap(a: LabelBBox, b: LabelBBox, pad = 2): boolean {
  return (
    a.left < b.right + pad &&
    a.right > b.left - pad &&
    a.top < b.bottom + pad &&
    a.bottom > b.top - pad
  );
}

type LayoutItem = {
  key: string;
  sliceAngle: number;
  midAngle: number;
  text: string;
  connectR: number;
  priority: number;
  visible: boolean;
  radialExtra: number;
  geo: PieOutsideLabelGeometry;
};

function rebuildItemGeo(item: LayoutItem, outerR: number, fontSize: number): void {
  item.geo = pieOutsideLabelGeometry(
    item.midAngle,
    outerR,
    fontSize,
    item.connectR,
    item.text,
    item.radialExtra,
  );
}

function segmentSegmentsCross(
  ax0: number,
  ay0: number,
  ax1: number,
  ay1: number,
  bx0: number,
  by0: number,
  bx1: number,
  by1: number,
): boolean {
  const d = (ax1 - ax0) * (by1 - by0) - (ay1 - ay0) * (bx1 - bx0);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((bx0 - ax0) * (by1 - by0) - (by0 - ay0) * (bx1 - bx0)) / d;
  const u = ((bx0 - ax0) * (ay1 - ay0) - (by0 - ay0) * (ax1 - ax0)) / d;
  const eps = 1e-5;
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
}

function leaderSegments(geo: PieOutsideLabelGeometry): [number, number, number, number][] {
  const segs: [number, number, number, number][] = [
    [geo.x0, geo.y0, geo.x1, geo.y1],
  ];
  if (Math.hypot(geo.textX - geo.x1, geo.textY - geo.y1) > 0.5) {
    segs.push([geo.x1, geo.y1, geo.textX, geo.textY]);
  }
  return segs;
}

function leaderLinesCross(a: PieOutsideLabelGeometry, b: PieOutsideLabelGeometry): boolean {
  const aSegs = leaderSegments(a);
  const bSegs = leaderSegments(b);
  for (const [ax0, ay0, ax1, ay1] of aSegs) {
    for (const [bx0, by0, bx1, by1] of bSegs) {
      if (segmentSegmentsCross(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1)) {
        return true;
      }
    }
  }
  return false;
}

function itemConflicts(
  item: LayoutItem,
  placed: LayoutItem[],
  fontSize: number,
): boolean {
  const box = labelTextBBox(item.geo, item.text, fontSize);
  for (const other of placed) {
    if (boxesOverlap(box, labelTextBBox(other.geo, other.text, fontSize))) {
      return true;
    }
    if (leaderLinesCross(item.geo, other.geo)) {
      return true;
    }
  }
  return false;
}

function resolvePieLabelSide(midAngle: number): "right" | "left" | "pole" {
  const cos = Math.cos(midAngle - Math.PI / 2);
  const sin = Math.sin(midAngle - Math.PI / 2);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);
  if (absCos > 0.65 || absCos > absSin) {
    return cos >= 0 ? "right" : "left";
  }
  return "pole";
}

/** 分侧按角度排序，仅径向拉长 + 引线不相交 */
function layoutSideWithoutCrossing(
  sideItems: LayoutItem[],
  outerR: number,
  fontSize: number,
): void {
  const sorted = [...sideItems].sort((a, b) => a.midAngle - b.midAngle);
  const radialOut = outsideLabelRadialOut(outerR, fontSize);
  const maxExtra = radialOut * 6;
  const radialStep = Math.max(2, fontSize * 0.3);
  const placed: LayoutItem[] = [];

  for (const item of sorted) {
    item.visible = true;
    let extra = placed.length > 0 ? placed[placed.length - 1].radialExtra : 0;

    for (let attempt = 0; attempt < 200; attempt++) {
      item.radialExtra = extra;
      rebuildItemGeo(item, outerR, fontSize);
      if (!itemConflicts(item, placed, fontSize)) break;
      extra += radialStep;
      if (extra > maxExtra) {
        item.visible = false;
        break;
      }
    }
    if (item.visible) placed.push(item);
  }
}

function avoidOutsideLabelOverlap(items: LayoutItem[], outerR: number, fontSize: number): void {
  const groups: Record<"right" | "left" | "pole", LayoutItem[]> = {
    right: [],
    left: [],
    pole: [],
  };
  for (const item of items) {
    groups[resolvePieLabelSide(item.midAngle)].push(item);
  }

  for (const group of Object.values(groups)) {
    layoutSideWithoutCrossing(group, outerR, fontSize);
  }

  const visible = () => items.filter((i) => i.visible);
  let changed = true;
  while (changed) {
    changed = false;
    const vis = visible();
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        const a = vis[i];
        const b = vis[j];
        const overlap = boxesOverlap(
          labelTextBBox(a.geo, a.text, fontSize),
          labelTextBBox(b.geo, b.text, fontSize),
        );
        const cross = leaderLinesCross(a.geo, b.geo);
        if (overlap || cross) {
          const loser = a.priority >= b.priority ? b : a;
          loser.visible = false;
          changed = true;
        }
      }
    }
  }
}

/** 外置标签：沿扇区角度径向分布 + 2D 防碰撞（对标扇形图 / ECharts avoidLabelOverlap） */
export function layoutPieOutsideLabels(
  candidates: PieOutsideLabelCandidate[],
  outerR: number,
  fontSize: number,
  _bounds: { ymin: number; ymax: number },
): Map<string, PieOutsideLabelPlaced> {
  const result = new Map<string, PieOutsideLabelPlaced>();

  const items: LayoutItem[] = [];
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
    const connectR = c.connectR ?? outerR;
    items.push({
      key: c.key,
      sliceAngle: c.sliceAngle,
      midAngle: c.midAngle,
      text: c.text,
      connectR,
      priority: c.priority ?? c.sliceAngle,
      visible: true,
      radialExtra: 0,
      geo: pieOutsideLabelGeometry(c.midAngle, outerR, fontSize, connectR, c.text),
    });
  }

  avoidOutsideLabelOverlap(items, outerR, fontSize);

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

export function pieOutsideLabelBounds(outerR: number, halfHeight?: number): { ymin: number; ymax: number } {
  const ymax = halfHeight ?? outerR * 1.42;
  return { ymin: -ymax, ymax };
}

export function pieArcLayoutKey(startAngle: number, endAngle: number): string {
  return `${startAngle}:${endAngle}`;
}

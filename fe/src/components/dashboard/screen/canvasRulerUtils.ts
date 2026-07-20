/** 横/纵标尺统一厚度（px） */
export const CANVAS_RULER_SIZE_PX = 28;

const MIN_TICK_GAP_PX = 4;
const MIN_LABEL_GAP_PX = 40;

export type CanvasRulerTickKind = "micro" | "minor" | "major";

export type CanvasRulerTick = {
  value: number;
  positionPx: number;
  kind: CanvasRulerTickKind;
  showLabel: boolean;
};

export type RulerStepDensity = {
  microStep: number;
  minorStep: number;
  labelStep: number;
};

/** 按缩放选择刻度密度：缩小时稀疏、放大时更密 */
export function resolveRulerStepDensity(scale: number): RulerStepDensity {
  const safeScale = scale > 0 ? scale : 1;
  let labelStep = 200;
  for (const candidate of [50, 100, 200, 500]) {
    if (candidate * safeScale >= 36) {
      labelStep = candidate;
      break;
    }
  }
  const minorStep = labelStep >= 100 ? 50 : labelStep >= 50 ? 10 : 5;
  const microStep = labelStep >= 100 ? 10 : 5;
  return { microStep, minorStep, labelStep };
}

function classifyTick(value: number, density: RulerStepDensity): CanvasRulerTickKind {
  if (value % density.labelStep === 0) return "major";
  if (value % density.minorStep === 0) return "minor";
  return "micro";
}

/** 按设计坐标生成标尺刻度（随平移与缩放偏移） */
export function buildCanvasRulerTicks(
  designLength: number,
  scale: number,
  scrollOffsetPx: number,
  viewportPx: number,
): CanvasRulerTick[] {
  if (scale <= 0 || viewportPx <= 0 || designLength <= 0) return [];

  const density = resolveRulerStepDensity(scale);
  const step = density.microStep;
  const visibleStart = scrollOffsetPx / scale;
  const visibleEnd = visibleStart + viewportPx / scale;
  const start = Math.max(0, Math.floor(visibleStart / step) * step);
  const end = Math.min(designLength, Math.ceil(visibleEnd / step) * step);
  const ticks: CanvasRulerTick[] = [];
  let lastLabelPx = Number.NEGATIVE_INFINITY;

  for (let value = start; value <= end; value += step) {
    const kind = classifyTick(value, density);
    if (kind === "micro" && step * scale < MIN_TICK_GAP_PX) continue;
    const positionPx = value * scale - scrollOffsetPx;
    const showLabel =
      kind === "major" &&
      density.labelStep * scale >= 36 &&
      positionPx - lastLabelPx >= MIN_LABEL_GAP_PX;
    if (showLabel) lastLabelPx = positionPx;
    ticks.push({ value, positionPx, kind, showLabel });
  }
  return ticks;
}

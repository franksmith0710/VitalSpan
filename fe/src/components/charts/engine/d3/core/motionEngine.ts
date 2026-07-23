import * as d3 from "d3";
import { chartTransition, prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { motionDuration, VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";

export function morphAttr(
  sel: d3.Selection<SVGElement, unknown, null, undefined>,
  name: string,
  value: number | string,
): void {
  chartTransition(sel).duration(motionDuration("dataUpdate")).attr(name, value);
}

export function morphNumber(
  from: number,
  to: number,
  onFrame: (v: number) => void,
  durationMs = motionDuration("dataUpdate"),
): () => void {
  if (prefersReducedMotion() || durationMs <= 0) {
    onFrame(to);
    return () => undefined;
  }
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = d3.easeCubicOut(t);
    onFrame(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function staggerDelay(index: number): number {
  return index * VCDS.motion.stagger;
}

export function pulseSelection(
  sel: d3.Selection<SVGElement, unknown, null, undefined>,
): void {
  if (prefersReducedMotion()) return;
  sel
    .transition()
    .duration(motionDuration("hover"))
    .attr("opacity", 0.7)
    .transition()
    .duration(motionDuration("hover"))
    .attr("opacity", 1);
}

/** 路径 d 属性 morph（数据更新） */
export function morphPath(
  sel: d3.Selection<SVGPathElement, unknown, null, undefined>,
  newD: string,
): void {
  if (prefersReducedMotion() || motionDuration("dataUpdate") <= 0) {
    sel.attr("d", newD);
    return;
  }
  chartTransition(sel).duration(motionDuration("dataUpdate")).attr("d", newD);
}

/** 选择集 stagger 入场（opacity + translateY） */
export function staggerEnterSelection<T extends SVGElement>(
  sel: d3.Selection<T, unknown, null, undefined>,
  getDelay: (index: number) => number = staggerDelay,
): void {
  if (prefersReducedMotion() || motionDuration("enter") <= 0) {
    sel.attr("opacity", 1);
    return;
  }
  sel
    .attr("opacity", 0)
    .transition()
    .delay((_d, i) => getDelay(i))
    .duration(motionDuration("enter"))
    .attr("opacity", 1);
}

/** brush 选区淡入 */
export function brushFade(
  sel: d3.Selection<SVGElement, unknown, null, undefined>,
  targetOpacity: number,
): void {
  if (prefersReducedMotion()) {
    sel.attr("opacity", targetOpacity);
    return;
  }
  chartTransition(sel).duration(motionDuration("hover")).attr("opacity", targetOpacity);
}

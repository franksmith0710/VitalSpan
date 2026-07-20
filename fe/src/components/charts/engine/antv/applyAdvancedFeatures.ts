import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";

/** markLine 等 deFeatures → G2Plot annotations（能映射则映射） */
export function applyAdvancedFeatures(
  plan: AntvRenderPlan,
  ctx: ChartStyleContext,
): AntvRenderPlan {
  if (plan.kind !== "g2plot") return plan;
  let options = { ...plan.options };
  const features = ctx.deFeatures;

  if (features?.markLines?.length && plan.plotType !== "Pie") {
    options.annotations = features.markLines.map((line) => ({
      type: "line",
      start: ["min", line.value],
      end: ["max", line.value],
      style: { stroke: line.color ?? "#465fff", lineDash: [4, 4] },
      text: line.name ? { content: line.name, position: "end" } : undefined,
    }));
  }

  return { ...plan, options };
}

import { memo, useMemo } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { getChartPlugin } from "@/components/charts/engine/plugins/registry";
import { AntvG2PieView } from "@/components/charts/engine/antv/g2/AntvG2PieView";
import { AntvG2PlotView } from "@/components/charts/engine/antv/g2plot/AntvG2PlotView";
import { AntvG6View } from "@/components/charts/engine/antv/g6/AntvG6View";
import { AntvMapView } from "@/components/charts/engine/antv/geo/AntvMapView";
import { AntvS2View } from "@/components/charts/engine/antv/s2/AntvS2View";

function resolveLibrary(chartType: string, planKind: string): string {
  const plugin = getChartPlugin(chartType);
  if (plugin) return plugin.library;
  if (planKind === "g2geo") return "g2";
  if (planKind === "g6") return "g6";
  if (planKind === "s2") return "s2";
  return "g2plot";
}

const PIE_G2_TYPES = new Set(["pie", "pie-donut", "pie-rose", "pie-donut-rose"]);

function AntvEngineViewInner(props: ChartEngineViewProps) {
  const plan = useMemo(() => buildAntvRenderPlan(props.viewModel), [props.viewModel]);
  const library = resolveLibrary(props.viewModel.chartType, plan.kind);

  if (PIE_G2_TYPES.has(props.viewModel.chartType)) {
    return <AntvG2PieView {...props} />;
  }
  if (library === "g2" || plan.kind === "g2geo") {
    return <AntvMapView {...props} />;
  }
  if (library === "g6" || plan.kind === "g6") {
    return <AntvG6View {...props} />;
  }
  if (library === "s2" || plan.kind === "s2") {
    return <AntvS2View {...props} />;
  }
  return <AntvG2PlotView {...props} />;
}

export const AntvEngineView = memo(AntvEngineViewInner);

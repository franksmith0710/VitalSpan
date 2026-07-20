import { memo } from "react";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { AntvEngineView } from "@/components/charts/engine/antv/AntvEngineView";

export type CanvasChartHostProps = ChartEngineViewProps;

function CanvasChartHostInner(props: CanvasChartHostProps) {
  return <AntvEngineView {...props} />;
}

export const CanvasChartHost = memo(CanvasChartHostInner);

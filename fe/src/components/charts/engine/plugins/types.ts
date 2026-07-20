import type { EngineCapabilities } from "@/components/charts/engine/capabilities";
import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import type { ChartViewModel } from "@/components/charts/engine/types";
import type { ChartStyleSectionId } from "@/lib/chartStyleSectionRegistry";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type ChartLibrary = "g2plot" | "g6" | "g2" | "s2" | "react";

export type DePaletteCategory =
  | "quota"
  | "table"
  | "trend"
  | "compare"
  | "distribute"
  | "map"
  | "relation"
  | "dual_axes";

export type ChartViewPlugin = {
  type: string;
  library: ChartLibrary;
  paletteCategory: DePaletteCategory;
  renderer: "antv" | "table" | "kpi";
  properties: ChartStyleSectionId[];
  engineCapabilities: EngineCapabilities;
  deprecated?: boolean;
  migratesTo?: string;
  buildRenderPlan: (vm: ChartViewModel) => AntvRenderPlan;
  setupDefaultConfig?: (cfg: ChartViewConfig) => ChartViewConfig;
};

export type ChartPluginDef = Omit<ChartViewPlugin, "buildRenderPlan"> & {
  planKind?: "column" | "line" | "pie" | "dual" | "geo" | "graph" | "s2" | "kpi" | "custom";
};

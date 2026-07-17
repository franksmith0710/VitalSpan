import type { ChartDrillFrame } from "@/lib/chartDrill";
import {
  aggregateRowsByField,
  canDrillDeeper,
  filterRowsByDrillStack,
  getDrillChain,
  type ChartDrillPipelineResult,
} from "@/lib/chartDrill";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import {
  isMunicipalityAdcode,
  lookupProvinceAdcode,
  resolveGeoMapLevelContext,
  type GeoMapLevelContext,
} from "@/lib/geoMapLevels";

function mapDisplayChainIndex(config: ChartViewConfig, stack: ChartDrillFrame[]): number {
  const chain = getDrillChain(config);
  if (!chain.length) return 0;
  let index = Math.min(stack.length, chain.length - 1);
  if (stack.length >= 1) {
    const provinceAdcode = lookupProvinceAdcode(stack[0].value);
    if (provinceAdcode && isMunicipalityAdcode(provinceAdcode) && stack.length === 1 && chain.length >= 3) {
      index = 2;
    }
  }
  return index;
}

function mapClickChainIndex(config: ChartViewConfig, stack: ChartDrillFrame[]): number {
  const chain = getDrillChain(config);
  if (!canDrillDeeper(stack, config)) return -1;
  let nextIndex = stack.length;
  if (stack.length === 1) {
    const provinceAdcode = lookupProvinceAdcode(stack[0].value);
    if (provinceAdcode && isMunicipalityAdcode(provinceAdcode) && chain.length >= 3) {
      nextIndex = 2;
    }
  }
  return nextIndex;
}

export function getMapDrillDisplayField(
  config: ChartViewConfig,
  stack: ChartDrillFrame[],
): string | undefined {
  const chain = getDrillChain(config);
  if (!chain.length) return undefined;
  return chain[mapDisplayChainIndex(config, stack)];
}

export function getMapDrillClickField(
  config: ChartViewConfig,
  stack: ChartDrillFrame[],
): string | undefined {
  const chain = getDrillChain(config);
  const index = mapClickChainIndex(config, stack);
  if (index < 0 || index >= chain.length) return undefined;
  return chain[index];
}

export function applyMapChartDrillPipeline(
  config: ChartViewConfig,
  columns: string[],
  rows: unknown[][],
  stack: ChartDrillFrame[],
): ChartDrillPipelineResult {
  const metrics = activeFieldRefs(config.metrics).map((item) => item.field);
  const filtered = filterRowsByDrillStack(rows, columns, stack);
  const displayField = getMapDrillDisplayField(config, stack);
  if (!displayField) {
    return { rows: filtered, columns };
  }
  const aggregated = aggregateRowsByField(filtered, columns, displayField, metrics);
  return { rows: aggregated, columns, displayField };
}

export type MapDrillPreflightResult =
  | { ok: true; context: GeoMapLevelContext }
  | { ok: false; message: string };

export async function preflightMapDrillClick(
  config: ChartViewConfig,
  stack: ChartDrillFrame[],
  frame: ChartDrillFrame,
): Promise<MapDrillPreflightResult> {
  const nextStack = [...stack, frame];
  const context = await resolveGeoMapLevelContext({ config, drillStack: nextStack });
  if (context.missingAsset) {
    return { ok: false, message: context.missingAsset };
  }
  if (context.drillDepth !== nextStack.length) {
    return { ok: false, message: "无法下钻到该层级，请检查地理字段与数据是否匹配" };
  }
  return { ok: true, context };
}

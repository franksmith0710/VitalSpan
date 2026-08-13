import { CHART_EXECUTE_LIMIT } from "@/lib/chartExecuteProbe";
import { isCartesianRowLimitedType, type ChartType } from "@/lib/chartViewConfig";

export function resolveCartesianRowLimit(queryLimit?: number): number {
  return queryLimit ?? CHART_EXECUTE_LIMIT;
}

export function isCartesianRowCountExceeded(
  chartType: ChartType,
  rowCount: number,
  queryLimit?: number,
): boolean {
  return isCartesianRowLimitedType(chartType) && rowCount > resolveCartesianRowLimit(queryLimit);
}

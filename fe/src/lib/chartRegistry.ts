import { apiFetch } from "@/lib/api";

export type ChartTypeCatalogItem = {
  type: string;
  displayName: string;
  category: string;
  renderer: string;
  styleVariants: string[];
  fieldRule: {
    minDimensions?: number;
    maxDimensions?: number;
    minMetrics?: number;
    maxMetrics?: number;
    note?: string;
  };
};

let cache: ChartTypeCatalogItem[] | null = null;

const FALLBACK_TYPES = [
  "table",
  "line",
  "bar",
  "pie",
  "gauge",
  "map",
  "sankey",
  "funnel",
  "graph",
] as const;

export function getCachedCatalog(): ChartTypeCatalogItem[] | null {
  return cache;
}

export function isKnownChartType(type: string): boolean {
  if (cache) return cache.some((c) => c.type === type);
  return (FALLBACK_TYPES as readonly string[]).includes(type);
}

export async function fetchChartTypeCatalog(): Promise<ChartTypeCatalogItem[]> {
  const body = await apiFetch<ChartTypeCatalogItem[]>("/api/v1/charts/types");
  cache = body;
  return body;
}

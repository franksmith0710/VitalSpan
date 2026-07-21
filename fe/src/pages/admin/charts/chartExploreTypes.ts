export type ChartTypeCatalogEntry = {
  type: string;
  displayName: string;
  category: string;
  renderer: string;
  styleVariants: string[];
  capabilities: string[];
  fieldRule: {
    minDimensions: number;
    maxDimensions: number;
    minMetrics: number;
    maxMetrics: number;
    note?: string | null;
  };
};

/**
 * Signed waivers for deriveFieldRuleFromDeCatalog max vs backend fieldRule (T-VIZ-R32-014).
 * GAP-MAX-DIM: 笛卡尔槽位语义 max=3（类+子类+钻取），backend registry max=8 待 Phase 5 产品确认后解除。
 */
export type FieldRuleMaxWaiver = {
  maxDimensions?: number;
  maxMetrics?: number;
  gapId: "GAP-MAX-DIM" | "GAP-TABLE-DRILL-COUNT" | "GAP-MAP-DRILL";
  reason: string;
};

/** chartType → signed max waiver（min 须严格相等，见 T-VIZ-R32-011） */
export const FIELD_RULE_MAX_WAIVERS: Record<string, FieldRuleMaxWaiver> = {
  line: {
    maxDimensions: 3,
    gapId: "GAP-MAX-DIM",
    reason: "cartesianTrendAxes: xDim+xAxisExt+drill=3; backend maxDimensions=8 pending MULTI_DIM",
  },
  area: {
    maxDimensions: 3,
    gapId: "GAP-MAX-DIM",
    reason: "cartesianTrendAxes",
  },
  "area-stack": {
    maxDimensions: 3,
    gapId: "GAP-MAX-DIM",
    reason: "cartesianTrendAxes with stack dim",
  },
  bar: { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "bar-stack": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "percentage-bar-stack": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "bar-group": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "bar-group-stack": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "bar-horizontal": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "bar-stack-horizontal": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "cartesianTrendAxes" },
  "percentage-bar-stack-horizontal": {
    maxDimensions: 3,
    gapId: "GAP-MAX-DIM",
    reason: "cartesianTrendAxes",
  },
  "chart-mix": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "dual_axes cartesian slots" },
  "chart-mix-group": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "dual_axes cartesian slots" },
  "chart-mix-stack": { maxDimensions: 3, gapId: "GAP-MAX-DIM", reason: "dual_axes cartesian slots" },
  "chart-mix-dual-line": {
    maxDimensions: 4,
    gapId: "GAP-MAX-DIM",
    reason: "cartesian + extBubble dim slot; backend max=8",
  },
  "table-info": {
    maxDimensions: 9,
    gapId: "GAP-TABLE-DRILL-COUNT",
    reason: "both multi maxD8 + drill1 in deriveFieldRule; backend maxD=8",
  },
  "table-normal": {
    maxDimensions: 9,
    gapId: "GAP-TABLE-DRILL-COUNT",
    reason: "multi dim8 + drill1; backend maxD=8",
  },
  map: {
    maxDimensions: 4,
    gapId: "GAP-MAP-DRILL",
    reason: "region + drill×2 in derive; backend maxD=3",
  },
  "map-3d": {
    maxDimensions: 4,
    gapId: "GAP-MAP-DRILL",
    reason: "region + drill×2 in derive; backend maxD=3",
  },
  kpi: {
    maxDimensions: 0,
    gapId: "GAP-MAX-DIM",
    reason: "metric-only slot; backend registry maxD=1 drift",
  },
};

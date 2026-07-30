import { describe, expect, it } from "vitest";
import { BUILTIN_PLUGIN_DEFS } from "@/components/charts/engine/plugins/metadata";
import {
  chartStyleSectionsFromProfile,
  resolveChartTypeStyleProfile,
} from "@/lib/chartTypeStyleProfiles";
import type { ChartType } from "@/lib/chartViewConfig";
import { filterStyleSectionsForChart } from "@/lib/chartStylePanelGates";

const ACTIVE_TYPES = BUILTIN_PLUGIN_DEFS.filter((d) => !d.deprecated).map(
  (d) => d.type,
) as ChartType[];

const TYPE_SHAPE_SECTION: Partial<Record<ChartType, string>> = {
  treemap: "treemapShape",
  "circle-packing": "circlePackingShape",
  quadrant: "quadrantShape",
  "progress-bar": "progressBarShape",
  "bullet-graph": "bulletShape",
  "stock-line": "stockLineShape",
  sankey: "sankeyShape",
  "word-cloud": "wordCloudShape",
  radar: "radarShape",
  gauge: "gaugeShape",
  liquid: "liquidShape",
  kpi: "kpiIndicator",
  funnel: "funnelShape",
  graph: "graphShape",
  pie: "pieShape",
  "pie-donut": "pieShape",
  "pie-rose": "pieShape",
  "pie-donut-rose": "pieShape",
  "table-info": "tableBasic",
  "table-normal": "tableBasic",
  "table-pivot": "tableBasic",
};

describe("chartTypeStyleProfiles", () => {
  it("bar has cartesian sections without variantBasic", () => {
    expect(chartStyleSectionsFromProfile("bar")).toContain("axis");
    expect(chartStyleSectionsFromProfile("bar")).not.toContain("variantBasic");
  });

  it("line has variantBasic first", () => {
    expect(chartStyleSectionsFromProfile("line")[0]).toBe("variantBasic");
  });

  it("radar hides legend in profile", () => {
    expect(chartStyleSectionsFromProfile("radar")).not.toContain("legend");
    expect(chartStyleSectionsFromProfile("radar")).toContain("radarShape");
  });

  it("gauge has gaugeShape", () => {
    expect(chartStyleSectionsFromProfile("gauge")).toContain("gaugeShape");
  });

  it("covers all active chart types with non-empty gated sections", () => {
    for (const type of ACTIVE_TYPES) {
      const raw = chartStyleSectionsFromProfile(type);
      const gated = filterStyleSectionsForChart(type, raw);
      expect(gated.length, type).toBeGreaterThan(0);
      expect(resolveChartTypeStyleProfile(type).sections.length, type).toBeGreaterThan(0);
    }
  });

  it("assigns type-specific shape sections for confirmed P0 types", () => {
    for (const [type, shapeId] of Object.entries(TYPE_SHAPE_SECTION)) {
      expect(chartStyleSectionsFromProfile(type as ChartType), type).toContain(shapeId);
    }
  });

  it("treemap and circle-packing expose new shape sections", () => {
    expect(chartStyleSectionsFromProfile("treemap")).toContain("treemapShape");
    expect(chartStyleSectionsFromProfile("circle-packing")).toContain("circlePackingShape");
  });
});

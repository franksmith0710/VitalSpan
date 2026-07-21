import { describe, expect, it } from "vitest";
import { chartStyleSectionsForType } from "@/lib/chartStyleSectionRegistry";
import { filterStyleSectionsForChart } from "@/lib/chartStylePanelGates";
import { resolveChartContentShellStyle } from "@/lib/chartDeStyle";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("inspector style wiring registry", () => {
  it("funnel exposes legend section (D3 wired)", () => {
    const sections = filterStyleSectionsForChart("funnel", chartStyleSectionsForType("funnel"));
    expect(sections).toContain("legend");
  });

  it("t-heatmap exposes geo section for cell label and visualMap", () => {
    const sections = chartStyleSectionsForType("t-heatmap");
    expect(sections).toContain("geo");
  });

  it("line charts expose variantBasic for style subtypes", () => {
    const sections = chartStyleSectionsForType("line");
    expect(sections[0]).toBe("variantBasic");
  });

  it("grid shell merges per-chart background override", () => {
    const cfg: ChartViewConfig = {
      chartType: "bar",
      dataSourceId: "ds",
      mode: "sql",
      sql: "select 1",
      dimensions: [{ field: "x" }],
      metrics: [{ field: "y" }],
      nativeBody: {
        deStyle: {
          background: { backgroundShow: true, background: "#112233" },
        },
      },
    };
    const shell = resolveChartContentShellStyle({ borderEnabled: true }, cfg, "light");
    expect(shell.outer.style.backgroundColor ?? shell.outer.style.background).toBeTruthy();
  });
});

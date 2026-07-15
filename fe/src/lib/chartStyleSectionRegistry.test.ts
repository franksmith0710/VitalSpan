import { describe, expect, it } from "vitest";
import { chartStyleSectionsForType } from "./chartStyleSectionRegistry";

describe("chartStyleSectionsForType", () => {
  it("table omits legend and remark", () => {
    expect(chartStyleSectionsForType("table")).toEqual([
      "tableBasic",
      "tableColor",
      "title",
      "background",
    ]);
  });

  it("bar includes variant, palette, legend and label", () => {
    expect(chartStyleSectionsForType("bar")).toEqual([
      "variantBasic",
      "background",
      "palette",
      "title",
      "remark",
      "legend",
      "label",
    ]);
  });

  it("pie includes legend and label", () => {
    const sections = chartStyleSectionsForType("pie");
    expect(sections).toContain("legend");
    expect(sections).toContain("label");
    expect(sections).toContain("variantBasic");
  });

  it("map includes geo block", () => {
    expect(chartStyleSectionsForType("map")).toContain("geo");
    expect(chartStyleSectionsForType("heatmap")).toContain("geo");
  });

  it("kpi uses label section for metric format", () => {
    expect(chartStyleSectionsForType("kpi")).toEqual([
      "background",
      "palette",
      "title",
      "label",
    ]);
  });
});

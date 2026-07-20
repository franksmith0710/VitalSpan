import { describe, expect, it } from "vitest";
import "@/components/charts/engine/plugins/index";
import { chartStyleSectionsForType } from "./chartStyleSectionRegistry";

describe("chartStyleSectionsForType", () => {
  it("returns table sections for table-info", () => {
    expect(chartStyleSectionsForType("table-info")).toEqual([
      "tableBasic",
      "tableColor",
      "palette",
      "title",
      "background",
    ]);
  });

  it("returns bar sections from plugin metadata", () => {
    expect(chartStyleSectionsForType("bar")).toEqual([
      "background",
      "palette",
      "title",
      "remark",
      "legend",
      "label",
    ]);
  });

  it("includes geo for map", () => {
    expect(chartStyleSectionsForType("map")).toContain("geo");
  });

  it("returns kpi sections", () => {
    expect(chartStyleSectionsForType("kpi")).toEqual([
      "background",
      "palette",
      "title",
      "label",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { chartStyleSectionsFromProfile } from "@/lib/chartTypeStyleProfiles";

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
});

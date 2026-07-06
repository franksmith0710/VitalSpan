import { describe, expect, it } from "vitest";
import { buildWidgetFilterParams, injectSqlParameters } from "./dashboardFilterUtils";

describe("dashboardFilterUtils", () => {
  it("injectSqlParameters replaces placeholders", () => {
    const sql = injectSqlParameters("SELECT * FROM t WHERE region = '{{region}}'", { region: "east" });
    expect(sql).toContain("east");
  });

  it("rejects unsafe parameter values", () => {
    expect(() => injectSqlParameters("{{x}}", { x: "a;drop" })).toThrow();
  });

  it("buildWidgetFilterParams only includes linked widget", () => {
    const params = buildWidgetFilterParams(
      "w1",
      {
        filters: [{ filterId: "f1", dimensionRef: "区域", defaultValue: "all" }],
        linkageRules: [{ sourceFilterId: "f1", targetWidgetIds: ["w1"], parameterKey: "region" }],
        refreshMode: "eager",
      },
      { f1: "east" },
    );
    expect(params).toEqual({ region: "east" });
  });
});

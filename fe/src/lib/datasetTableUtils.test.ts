import { describe, expect, it } from "vitest";
import { parseQualifiedTable, tablesMatchForBind } from "./datasetTableUtils";

describe("tablesMatchForBind", () => {
  it("matches qualified names with schema.table bind payload", () => {
    expect(
      tablesMatchForBind("sample_db.gov_budget_items", "sample_db", "gov_budget_items"),
    ).toBe(true);
  });

  it("matches when bind table is fully qualified", () => {
    expect(
      tablesMatchForBind("sample_db.gov_budget_items", "sample_db", "sample_db.gov_budget_items"),
    ).toBe(true);
  });

  it("treats missing bind table as compatible", () => {
    expect(tablesMatchForBind("public.orders", undefined, undefined)).toBe(true);
  });

  it("rejects different tables", () => {
    expect(tablesMatchForBind("sample_db.orders", "sample_db", "gov_budget_items")).toBe(false);
  });

  it("defaults bare table schema to public", () => {
    expect(tablesMatchForBind("orders", "public", "orders")).toBe(true);
    expect(parseQualifiedTable("orders")).toEqual({ schema: "", table: "orders" });
  });
});

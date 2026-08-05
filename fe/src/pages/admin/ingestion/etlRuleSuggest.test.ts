import { describe, expect, it } from "vitest";
import { suggestEtlRulesFromColumns, summarizeEtlRules } from "./etlRuleSuggest";

describe("suggestEtlRulesFromColumns", () => {
  it("suggests cast for string-like amount column", () => {
    const rules = suggestEtlRulesFromColumns([
      { name: "amount", dataType: "varchar" },
      { name: "id", dataType: "int" },
    ]);
    expect(rules).toContainEqual({ type: "cast_type", column: "amount", to: "float" });
    expect(rules.some((r) => r.column === "id")).toBe(false);
  });

  it("adds status deleted filter when status column exists", () => {
    const rules = suggestEtlRulesFromColumns([{ name: "status", dataType: "varchar" }]);
    expect(rules).toContainEqual({
      type: "filter_rows",
      column: "status",
      op: "ne",
      value: "deleted",
    });
  });

  it("suggests rename for product_name column", () => {
    const rules = suggestEtlRulesFromColumns([{ name: "product_name", dataType: "varchar" }]);
    expect(rules).toContainEqual({ type: "rename_column", from: "product_name", to: "product" });
  });

  it("suggests fill_null for note column", () => {
    const rules = suggestEtlRulesFromColumns([{ name: "note", dataType: "text" }]);
    expect(rules).toContainEqual({ type: "fill_null", column: "note", value: "无备注" });
  });
});

describe("summarizeEtlRules", () => {
  it("returns empty summary", () => {
    expect(summarizeEtlRules([])).toBe("无清洗规则（原样入湖）");
  });

  it("summarizes mixed rules", () => {
    const summary = summarizeEtlRules([
      { type: "rename_column", from: "product_name", to: "product" },
      { type: "cast_type", column: "amount", to: "float" },
    ]);
    expect(summary).toContain("product_name→product");
    expect(summary).toContain("amount→float");
  });
});

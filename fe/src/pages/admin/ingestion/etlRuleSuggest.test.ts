import { describe, expect, it } from "vitest";
import { suggestEtlRulesFromColumns } from "./etlRuleSuggest";

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
});

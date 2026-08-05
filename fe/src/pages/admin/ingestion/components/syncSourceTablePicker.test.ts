import { describe, expect, it } from "vitest";
import { resolveSyncSourceSchema, supportsSyncSourceTablePicker } from "./syncSourceTablePicker";

describe("syncSourceTablePicker", () => {
  it("supports mysql metadata picker", () => {
    expect(supportsSyncSourceTablePicker("mysql")).toBe(true);
  });

  it("rest_api stays manual input", () => {
    expect(supportsSyncSourceTablePicker("rest_api")).toBe(false);
  });

  it("prefers connection database as schema", () => {
    expect(resolveSyncSourceSchema(["information_schema", "sample_db"], "sample_db")).toBe(
      "sample_db",
    );
  });
});

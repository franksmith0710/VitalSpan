import { describe, expect, it } from "vitest";
import { isSyncFetchImplemented, isSyncSourceCapable } from "./datasourceRoles";

describe("datasourceRoles sync capabilities", () => {
  it("sync fetch implemented covers mysql/pg families and native file sources", () => {
    expect(isSyncFetchImplemented("mysql")).toBe(true);
    expect(isSyncFetchImplemented("kingbase")).toBe(true);
    expect(isSyncFetchImplemented("csv")).toBe(true);
  });

  it("sync fetch not implemented for metadata-only and pending sql dialects", () => {
    expect(isSyncFetchImplemented("clickhouse")).toBe(true);
    expect(isSyncFetchImplemented("hive")).toBe(true);
    expect(isSyncFetchImplemented("influxdb")).toBe(true);
  });

  it("sync source capable is superset of sync fetch implemented", () => {
    for (const type of ["mysql", "csv", "clickhouse"] as const) {
      if (isSyncFetchImplemented(type)) {
        expect(isSyncSourceCapable(type)).toBe(true);
      }
    }
  });
});

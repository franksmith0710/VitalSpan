import { describe, expect, it } from "vitest";
import {
  isDemoPackageDashboard,
  isDemoPackageDatasource,
  readDemoPackageMeta,
} from "./demoPackage";

describe("demoPackage", () => {
  it("detects demo datasource code", () => {
    expect(isDemoPackageDatasource("demo")).toBe(true);
    expect(isDemoPackageDatasource("prod")).toBe(false);
  });

  it("detects demo dashboard by slug or layout meta", () => {
    expect(isDemoPackageDashboard({ slug: "demo-dual-kpi" })).toBe(true);
    expect(
      isDemoPackageDashboard({
        slug: "custom-board",
        layoutJson: {
          version: 1,
          widgets: [],
          globalFilters: [],
          demoPackage: { seed: true, sourceTemplateKey: "builtin-dash-dual-kpi" },
        },
      }),
    ).toBe(true);
    expect(isDemoPackageDashboard({ slug: "custom-board" })).toBe(false);
  });

  it("reads demo package meta only when seeded", () => {
    expect(
      readDemoPackageMeta({
        version: 1,
        widgets: [],
        globalFilters: [],
        demoPackage: { seed: true },
      }),
    ).toEqual({ seed: true });
    expect(
      readDemoPackageMeta({
        version: 1,
        widgets: [],
        globalFilters: [],
        demoPackage: { seed: false },
      }),
    ).toBeNull();
  });
});

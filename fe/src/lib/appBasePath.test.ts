import { describe, expect, it } from "vitest";
import {
  getAppBasePath,
  isExportSnapshotPath,
  matchExportDashboardId,
  stripAppBase,
} from "./appBasePath";

describe("appBasePath", () => {
  it("stripAppBase handles root base", () => {
    expect(stripAppBase("/export/dashboard/d1")).toBe("/export/dashboard/d1");
    expect(isExportSnapshotPath("/export/dashboard/d1")).toBe(true);
    expect(matchExportDashboardId("/export/data-screen/d2")).toBe("d2");
  });

  it("getAppBasePath returns empty for default vite base", () => {
    expect(getAppBasePath()).toBe("");
  });
});

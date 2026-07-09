import { describe, expect, it } from "vitest";

import { dashboardLayoutToView } from "./dashboardLayoutToView";

describe("dashboardLayoutToView", () => {
  it("maps dashboard storage to DashboardView protocol", () => {
    const layout = { version: 1, widgets: [], globalFilters: [] };
    const doc = dashboardLayoutToView({
      dashboardId: "00000000-0000-4000-8000-000000000001",
      name: "Sales",
      layoutJson: layout,
    });
    expect(doc.protocolVersion).toBe(1);
    expect(doc.dashboardId).toBe("00000000-0000-4000-8000-000000000001");
    expect(doc.name).toBe("Sales");
    expect(doc.layout).toEqual(layout);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

import { resolveDefaultDashboardPath } from "./defaultViewResolve";

describe("resolveDefaultDashboardPath", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("returns first role dashboard path", async () => {
    mockApiFetch.mockResolvedValueOnce({
      dashboardId: "d-1",
      reportTemplateNodeId: null,
      maxWidgetCount: 24,
      inheritFromRoleId: null,
    });
    const path = await resolveDefaultDashboardPath(["viewer", "admin"]);
    expect(path).toBe("/admin/dashboards/d-1");
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/roles/viewer/default-views");
  });

  it("follows inheritFromRoleId chain", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        dashboardId: null,
        inheritFromRoleId: "analyst",
        maxWidgetCount: 24,
      })
      .mockResolvedValueOnce({
        dashboardId: "d-2",
        inheritFromRoleId: null,
        maxWidgetCount: 24,
      });
    const path = await resolveDefaultDashboardPath(["viewer"]);
    expect(path).toBe("/admin/dashboards/d-2");
  });

  it("returns null when no defaults", async () => {
    mockApiFetch.mockResolvedValue({
      dashboardId: null,
      inheritFromRoleId: null,
      maxWidgetCount: 24,
    });
    expect(await resolveDefaultDashboardPath(["viewer"])).toBeNull();
  });
});

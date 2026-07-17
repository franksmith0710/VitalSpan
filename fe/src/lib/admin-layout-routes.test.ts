import { describe, expect, it } from "vitest";
import { isAdminListFillRoute } from "./admin-layout-routes";

describe("isAdminListFillRoute", () => {
  it("matches paginated list routes", () => {
    expect(isAdminListFillRoute("/admin/system/roles")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/users/")).toBe(true);
    expect(isAdminListFillRoute("/admin/dashboards")).toBe(true);
    expect(isAdminListFillRoute("/admin/data-screens")).toBe(true);
  });

  it("does not match edit or detail routes", () => {
    expect(isAdminListFillRoute("/admin/dashboards/abc/edit")).toBe(false);
    expect(isAdminListFillRoute("/admin/datasources/new")).toBe(false);
    expect(isAdminListFillRoute("/admin/account/profile")).toBe(false);
  });
});

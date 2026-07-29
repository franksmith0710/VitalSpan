import { describe, expect, it } from "vitest";
import { isAdminListFillRoute, isAdminScreenPreviewRoute, isAdminVizComponentEditRoute } from "./admin-layout-routes";

describe("isAdminListFillRoute", () => {
  it("matches paginated list routes", () => {
    expect(isAdminListFillRoute("/admin/system/roles")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/users/")).toBe(true);
    expect(isAdminListFillRoute("/admin/dashboards")).toBe(true);
    expect(isAdminListFillRoute("/admin/data-screens")).toBe(true);
    expect(isAdminListFillRoute("/admin/viz-templates")).toBe(true);
    expect(isAdminListFillRoute("/admin/viz-components")).toBe(true);
  });

  it("does not match edit or detail routes", () => {
    expect(isAdminListFillRoute("/admin/dashboards/abc/edit")).toBe(false);
    expect(isAdminListFillRoute("/admin/viz-components/abc/edit")).toBe(false);
    expect(isAdminListFillRoute("/admin/datasources/new")).toBe(false);
    expect(isAdminListFillRoute("/admin/account/profile")).toBe(false);
  });
});

describe("isAdminScreenPreviewRoute", () => {
  it("matches data screen preview chromeless route", () => {
    expect(isAdminScreenPreviewRoute("/admin/data-screens/abc/preview")).toBe(true);
    expect(isAdminScreenPreviewRoute("/admin/data-screens/abc/edit")).toBe(false);
  });
});

describe("isAdminVizComponentEditRoute", () => {
  it("matches viz component edit fill route", () => {
    expect(isAdminVizComponentEditRoute("/admin/viz-components/abc/edit")).toBe(true);
    expect(isAdminVizComponentEditRoute("/admin/viz-components/abc/edit/")).toBe(true);
    expect(isAdminVizComponentEditRoute("/admin/viz-components")).toBe(false);
    expect(isAdminVizComponentEditRoute("/admin/viz-components/new")).toBe(false);
  });
});

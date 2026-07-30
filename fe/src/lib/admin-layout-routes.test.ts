import { describe, expect, it } from "vitest";
import {
  isAdminConstrainedRoute,
  isAdminDashboardBuilderRoute,
  isAdminListFillRoute,
  isAdminMaxWidthNoneRoute,
  isAdminScreenPreviewRoute,
  isAdminShareRoute,
  isAdminVizComponentEditRoute,
  isAdminWideScrollRoute,
} from "./admin-layout-routes";

describe("isAdminListFillRoute", () => {
  it("matches paginated list routes", () => {
    expect(isAdminListFillRoute("/admin/system/roles")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/users/")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/rls")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/orgs")).toBe(true);
    expect(isAdminListFillRoute("/admin/system/grants")).toBe(true);
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

describe("isAdminWideScrollRoute", () => {
  it("matches report, governance, designer, metadata, and detail routes", () => {
    expect(isAdminWideScrollRoute("/admin/reports")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/reports/center")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/reports/templates")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/reports/view/node-1")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/governance/tickets")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/governance/publish")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/designer")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/metadata")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/metadata/glossary")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/datasources/ds-1")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/themes/dash-1")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/entities/overview")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/ingestion/sync-jobs/j1/history")).toBe(true);
    expect(isAdminWideScrollRoute("/admin/ingestion/sync-jobs/j1/etl-rules")).toBe(true);
  });

  it("does not match form routes or datasource list", () => {
    expect(isAdminWideScrollRoute("/admin/datasources")).toBe(false);
    expect(isAdminWideScrollRoute("/admin/datasources/new")).toBe(false);
    expect(isAdminWideScrollRoute("/admin/datasources/ds-1/edit")).toBe(false);
    expect(isAdminWideScrollRoute("/admin/account/profile")).toBe(false);
  });
});

describe("isAdminMaxWidthNoneRoute", () => {
  it("is true for list, share, wide scroll, and dashboard builder routes", () => {
    expect(isAdminMaxWidthNoneRoute("/admin/dashboards")).toBe(true);
    expect(isAdminMaxWidthNoneRoute("/admin/reports/center")).toBe(true);
    expect(isAdminMaxWidthNoneRoute("/admin/dashboards/d1/share")).toBe(true);
    expect(
      isAdminMaxWidthNoneRoute("/admin/dashboards/d1/edit", { dashboardBuilder: true }),
    ).toBe(true);
  });

  it("stays false for constrained form and account routes", () => {
    expect(isAdminMaxWidthNoneRoute("/admin/account/profile")).toBe(false);
    expect(isAdminMaxWidthNoneRoute("/admin/datasources/new")).toBe(false);
    expect(isAdminMaxWidthNoneRoute("/admin/datasets/d1/edit")).toBe(false);
    expect(isAdminMaxWidthNoneRoute("/admin/ingestion/sync-jobs/new")).toBe(false);
  });
});

describe("isAdminConstrainedRoute", () => {
  it("matches account and form-only routes", () => {
    expect(isAdminConstrainedRoute("/admin/account/security")).toBe(true);
    expect(isAdminConstrainedRoute("/admin/datasources/new")).toBe(true);
    expect(isAdminConstrainedRoute("/admin/ingestion/sync-jobs/j1/edit")).toBe(true);
  });
});

describe("isAdminDashboardBuilderRoute", () => {
  it("matches dashboard and data screen view/edit paths", () => {
    expect(isAdminDashboardBuilderRoute("/admin/dashboards/d1")).toBe(true);
    expect(isAdminDashboardBuilderRoute("/admin/dashboards/d1/edit")).toBe(true);
    expect(isAdminDashboardBuilderRoute("/admin/data-screens/ds1/edit/")).toBe(true);
    expect(isAdminDashboardBuilderRoute("/admin/dashboards/d1/share")).toBe(false);
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

describe("isAdminShareRoute", () => {
  it("matches dashboard and data screen share routes", () => {
    expect(isAdminShareRoute("/admin/dashboards/d1/share")).toBe(true);
    expect(isAdminShareRoute("/admin/data-screens/ds1/share/")).toBe(true);
  });

  it("does not match edit, preview, or list routes", () => {
    expect(isAdminShareRoute("/admin/dashboards")).toBe(false);
    expect(isAdminShareRoute("/admin/dashboards/d1/edit")).toBe(false);
    expect(isAdminShareRoute("/admin/data-screens/ds1/preview")).toBe(false);
  });
});

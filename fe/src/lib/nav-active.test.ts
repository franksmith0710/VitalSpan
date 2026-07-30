import { describe, expect, it } from "vitest";
import { isNavPathActive, navPathMatches, resolveActiveNavPath } from "./nav-active";

const REPORT_SUB_PATHS = [
  "/admin/reports/center",
  "/admin/reports",
  "/admin/reports/templates",
  "/admin/reports/schedules",
];

describe("nav-active", () => {
  it("matches exact path and descendants", () => {
    expect(navPathMatches("/admin/reports", "/admin/reports")).toBe(true);
    expect(navPathMatches("/admin/reports/foo", "/admin/reports")).toBe(true);
    expect(navPathMatches("/admin/reports-center", "/admin/reports")).toBe(false);
  });

  it("resolves longest prefix among sibling report paths", () => {
    expect(resolveActiveNavPath("/admin/reports/center", REPORT_SUB_PATHS)).toBe(
      "/admin/reports/center",
    );
    expect(resolveActiveNavPath("/admin/reports", REPORT_SUB_PATHS)).toBe("/admin/reports");
    expect(resolveActiveNavPath("/admin/reports/templates/new", REPORT_SUB_PATHS)).toBe(
      "/admin/reports/templates",
    );
  });

  it("does not mark 预制报表 active when on 全部报表", () => {
    expect(
      isNavPathActive("/admin/reports/center", "/admin/reports/center", REPORT_SUB_PATHS),
    ).toBe(true);
    expect(isNavPathActive("/admin/reports/center", "/admin/reports", REPORT_SUB_PATHS)).toBe(
      false,
    );
  });
});

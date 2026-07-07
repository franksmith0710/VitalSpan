import { describe, expect, it } from "vitest";
import { resolveNavGroups, ACTIVE_MILESTONES } from "./resolve-nav";
import { sessionUserFromAuth } from "./session";

describe("resolveNavGroups", () => {
  it("returns full admin nav for admin", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("admin", ["admin"]));
    expect(groups.some((g) => g.title === "系统")).toBe(true);
    expect(groups.some((g) => g.title === "数据")).toBe(true);
  });

  it("returns analyst nav without system or data groups", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("analyst", ["analyst"]));
    expect(groups.some((g) => g.title === "分析")).toBe(true);
    expect(groups.some((g) => g.title === "主题与实体")).toBe(true);
    expect(groups.some((g) => g.title === "系统")).toBe(false);
    expect(groups.some((g) => g.title === "数据")).toBe(false);
  });

  it("returns viewer nav with 分析 and 报表 sections only (no 系统/数据)", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]));
    const sectionTitles = groups.map((g) => g.title);
    expect(sectionTitles).toContain("分析");
    expect(sectionTitles).toContain("报表");
    expect(sectionTitles).not.toContain("系统");
    expect(sectionTitles).not.toContain("数据");
    // 分析 section has Dashboard
    const analysisSection = groups.find((g) => g.title === "分析");
    expect(analysisSection?.items.map((i) => i.name)).toContain("Dashboard");
    // no legacy top-level 数据源 item
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("数据源");
    // 报表 parent item exists
    const reportSection = groups.find((g) => g.title === "报表");
    expect(reportSection?.items.map((i) => i.name)).toContain("报表");
  });

  // T-NAV-MF-01: viewer does not see M13 items
  it("T-NAV-MF-01: viewer does not see M13 items", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]));
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("查询设计器");
    expect(allItemNames).not.toContain("治理工单");
    expect(allItemNames).not.toContain("发布流水线");
    expect(allItemNames).not.toContain("元数据");
    expect(allItemNames).not.toContain("Dataset");
  });

  // T-NAV-MF-02: analyst does not see M13 items
  it("T-NAV-MF-02: analyst does not see M13 items", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("analyst", ["analyst"]));
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("查询设计器");
    expect(allItemNames).not.toContain("治理工单");
    expect(allItemNames).not.toContain("元数据");
    expect(allItemNames).not.toContain("Dataset");
  });

  // T-NAV-MF-03: admin sees M13 items with preview=true
  it("T-NAV-MF-03: admin sees M13 items with preview: true", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("admin", ["admin"]));
    const allItems = groups.flatMap((g) => g.items);
    const designer = allItems.find((i) => i.name === "查询设计器");
    expect(designer).toBeDefined();
    expect(designer?.preview).toBe(true);
    const ticket = allItems.find((i) => i.name === "治理工单");
    expect(ticket).toBeDefined();
    expect(ticket?.preview).toBe(true);
  });

  // T-NAV-MF-04: capabilities override — admin with only M1 filters M7/M11/M13
  it("T-NAV-MF-04: capabilities override filters M7/M11/M13 for admin", () => {
    const groups = resolveNavGroups(
      sessionUserFromAuth("admin", ["admin"]),
      new Set(["M1"]),
    );
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    // M13 items show as preview for admin even with M1-only caps
    const allItems = groups.flatMap((g) => g.items);
    const designer = allItems.find((i) => i.name === "查询设计器");
    expect(designer?.preview).toBe(true);
    // M7 items like 实体总览 have preview=true for admin
    const entity = allItems.find((i) => i.name === "实体总览");
    expect(entity?.preview).toBe(true);
    // 报表 parent subItems: 报表模板(M7) and 报表调度(M11) get preview for admin
    const reportSection = groups.find((g) => g.title === "报表");
    const reportParent = reportSection?.items.find((i) => i.name === "报表");
    // All 3 subItems still appear for admin (preview applies at item level, subItems filtered differently)
    expect(reportParent?.subItems?.map((s) => s.name)).toContain("预制报表");
  });

  // T-NAV-MF-05: viewer with M1-only capabilities — 报表 subItems only contains 预制报表
  it("T-NAV-MF-05: viewer with M1-only capabilities sees 报表 parent with only 预制报表 subItem", () => {
    const groups = resolveNavGroups(
      sessionUserFromAuth("viewer", ["viewer"]),
      new Set(["M1"]),
    );
    const reportSection = groups.find((g) => g.title === "报表");
    expect(reportSection).toBeDefined();
    const reportParent = reportSection?.items.find((i) => i.name === "报表");
    expect(reportParent).toBeDefined();
    const subNames = reportParent?.subItems?.map((s) => s.name) ?? [];
    expect(subNames).toContain("预制报表");
    expect(subNames).not.toContain("报表模板");
    expect(subNames).not.toContain("报表调度");
  });

  // T-NAV-MF-06: admin 数据 section has 数据连接 item with 连接器类型 subItem
  it("T-NAV-MF-06: admin 数据 section has 数据连接 with 连接器类型 subItem", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("admin", ["admin"]));
    const dataSection = groups.find((g) => g.title === "数据");
    expect(dataSection).toBeDefined();
    const dataConn = dataSection?.items.find((i) => i.name === "数据连接");
    expect(dataConn).toBeDefined();
    const subNames = dataConn?.subItems?.map((s) => s.name) ?? [];
    expect(subNames).toContain("连接管理");
    expect(subNames).toContain("连接器类型");
  });
});

describe("ACTIVE_MILESTONES", () => {
  it("exports ACTIVE_MILESTONES containing M1, M7, M11 but not M13", () => {
    expect(ACTIVE_MILESTONES.has("M1")).toBe(true);
    expect(ACTIVE_MILESTONES.has("M7")).toBe(true);
    expect(ACTIVE_MILESTONES.has("M11")).toBe(true);
    expect(ACTIVE_MILESTONES.has("M13")).toBe(false);
  });
});

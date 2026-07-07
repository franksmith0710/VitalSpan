import { describe, expect, it } from "vitest";
import { OPTIONAL_ROLE_CAPABILITY_MAP } from "./capabilities";
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
    const analysisSection = groups.find((g) => g.title === "分析");
    expect(analysisSection?.items.map((i) => i.name)).toContain("Dashboard");
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("数据源");
    const reportSection = groups.find((g) => g.title === "报表");
    expect(reportSection?.items.map((i) => i.name)).toContain("报表");
  });

  it("T-NAV-MF-01: viewer does not see M13 items", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]));
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("查询设计器");
    expect(allItemNames).not.toContain("治理工单");
    expect(allItemNames).not.toContain("发布流水线");
    expect(allItemNames).not.toContain("元数据");
    expect(allItemNames).not.toContain("Dataset");
  });

  it("T-NAV-MF-02: analyst does not see M13 items", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("analyst", ["analyst"]));
    const allItemNames = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(allItemNames).not.toContain("查询设计器");
    expect(allItemNames).not.toContain("治理工单");
    expect(allItemNames).not.toContain("元数据");
    expect(allItemNames).not.toContain("Dataset");
  });

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

  it("T-NAV-MF-04: capabilities override filters M7/M11/M13 for admin", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("admin", ["admin"]), {
      activeMilestones: new Set(["M1"]),
    });
    const allItems = groups.flatMap((g) => g.items);
    const designer = allItems.find((i) => i.name === "查询设计器");
    expect(designer?.preview).toBe(true);
    const entity = allItems.find((i) => i.name === "实体总览");
    expect(entity?.preview).toBe(true);
    const reportSection = groups.find((g) => g.title === "报表");
    const reportParent = reportSection?.items.find((i) => i.name === "报表");
    expect(reportParent?.subItems?.map((s) => s.name)).toContain("预制报表");
  });

  it("T-NAV-MF-05: viewer with M1-only capabilities sees 报表 parent with only 预制报表 subItem", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]), {
      activeMilestones: new Set(["M1"]),
    });
    const reportSection = groups.find((g) => g.title === "报表");
    expect(reportSection).toBeDefined();
    const reportParent = reportSection?.items.find((i) => i.name === "报表");
    expect(reportParent).toBeDefined();
    const subNames = reportParent?.subItems?.map((s) => s.name) ?? [];
    expect(subNames).toContain("预制报表");
    expect(subNames).not.toContain("报表模板");
    expect(subNames).not.toContain("报表调度");
  });

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

  it("T-NAV-CAP-01: admin sees 系统 section with 资源授权 item", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("admin", ["admin"]));
    const system = groups.find((g) => g.title === "系统");
    expect(system).toBeDefined();
    const names = system?.items.map((i) => i.name) ?? [];
    expect(names).toContain("资源授权");
  });

  it("T-NAV-CAP-02: viewer does not see 系统 section", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]));
    expect(groups.some((g) => g.title === "系统")).toBe(false);
  });

  it("T-NAV-CAP-03: custom role with report:* sees 报表 only", () => {
    OPTIONAL_ROLE_CAPABILITY_MAP.reports_editor = ["report:*"];
    try {
      const groups = resolveNavGroups(
        sessionUserFromAuth("editor", ["viewer"]),
        { userCapabilities: new Set(["report:*"]) },
      );
      const titles = groups.map((g) => g.title);
      expect(titles).toContain("报表");
      expect(titles).not.toContain("系统");
      expect(titles).not.toContain("数据");
    } finally {
      delete OPTIONAL_ROLE_CAPABILITY_MAP.reports_editor;
    }
  });

  it("T-NAV-CAP-04: analyst sees 分析 and 报表, not 数据 or 系统", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("analyst", ["analyst"]));
    const titles = groups.map((g) => g.title);
    expect(titles).toContain("分析");
    expect(titles).toContain("报表");
    expect(titles).not.toContain("数据");
    expect(titles).not.toContain("系统");
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

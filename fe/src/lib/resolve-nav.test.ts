import { describe, expect, it } from "vitest";
import { resolveNavGroups } from "./resolve-nav";
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

  it("returns viewer consumption nav", () => {
    const groups = resolveNavGroups(sessionUserFromAuth("viewer", ["viewer"]));
    const items = groups.flatMap((g) => g.items.map((i) => i.name));
    expect(items).toContain("Dashboard");
    expect(items).toContain("预制报表");
    expect(items).not.toContain("数据源");
  });
});

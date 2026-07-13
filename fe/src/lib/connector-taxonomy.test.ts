import { describe, expect, it } from "vitest";
import {
  groupTypesByDisplayGroup,
  normalizeConnectorTypeItem,
  normalizeConnectorTypes,
} from "./connector-taxonomy";

describe("connector-taxonomy normalize", () => {
  it("FB-1-FE-01: snake_case API fields map to displayGroup", () => {
    const item = normalizeConnectorTypeItem({
      type: "mysql",
      display_name: "MySQL",
      category: "relational",
      capabilities: ["sql"],
      display_group: "oltp",
      category_label: "关系型数据库",
    });
    expect(item.displayName).toBe("MySQL");
    expect(item.displayGroup).toBe("oltp");
    expect(item.categoryLabel).toBe("关系型数据库");
  });

  it("FB-1-FE-02: missing displayGroup derives from category", () => {
    const item = normalizeConnectorTypeItem({
      type: "starrocks",
      displayName: "StarRocks",
      category: "olap",
      capabilities: ["sql"],
    });
    expect(item.displayGroup).toBe("olap");
    expect(item.categoryLabel).toBe("OLAP");
  });

  it("FB-1-FE-03: groupTypesByDisplayGroup splits legacy API rows", () => {
    const grouped = groupTypesByDisplayGroup(
      normalizeConnectorTypes([
        { type: "mysql", display_name: "MySQL", category: "relational" },
        { type: "starrocks", display_name: "StarRocks", category: "olap" },
        { type: "excel", display_name: "Excel", category: "file" },
      ]),
    );
    expect(grouped.get("oltp")).toHaveLength(1);
    expect(grouped.get("olap")).toHaveLength(1);
    expect(grouped.get("file")).toHaveLength(1);
    expect(grouped.get("extension")).toHaveLength(0);
  });

  it("R1.5: queryCapable and queryMode from API", () => {
    const capable = normalizeConnectorTypeItem({
      type: "mariadb",
      displayName: "MariaDB",
      category: "relational",
      queryCapable: true,
      queryMode: "sql",
    });
    expect(capable.queryCapable).toBe(true);
    expect(capable.queryMode).toBe("sql");

    const connOnly = normalizeConnectorTypeItem({
      type: "hive",
      displayName: "Hive",
      category: "lake",
      queryCapable: false,
      queryMode: null,
    });
    expect(connOnly.queryCapable).toBe(false);
    expect(connOnly.queryMode).toBe(null);
  });
});

import { describe, expect, it } from "vitest";
import {
  localizeCenterResourceType,
  resolveCenterRecentHref,
} from "./reportCenterNav";

describe("reportCenterNav", () => {
  it("localizes resource types", () => {
    expect(localizeCenterResourceType("template")).toBe("文档模板");
    expect(localizeCenterResourceType("prefab")).toBe("预制分析");
  });

  it("resolves recent view hrefs", () => {
    expect(resolveCenterRecentHref({ resourceType: "template", resourceId: "tpl-1" })).toBe(
      "/admin/reports/view/tpl-1",
    );
    expect(resolveCenterRecentHref({ resourceType: "prefab", resourceId: "k1" })).toBe(
      "/admin/reports?binding=k1",
    );
    expect(resolveCenterRecentHref({ resourceType: "schedule", resourceId: "s1" })).toBe(
      "/admin/reports/schedules?tab=all&expand=s1",
    );
  });
});

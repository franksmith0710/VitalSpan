import { describe, expect, it } from "vitest";
import {
  canRetryReportSchedules,
  localizeCenterResourceType,
  resolveCenterRecentHref,
  resolveReportCenterSubNavPath,
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

  it("gates schedule retry by capability", () => {
    expect(canRetryReportSchedules(["report:read"])).toBe(false);
    expect(canRetryReportSchedules(["report:manage"])).toBe(true);
    expect(canRetryReportSchedules(["dashboard:schedule"])).toBe(true);
    expect(canRetryReportSchedules(["report:*"])).toBe(true);
    expect(canRetryReportSchedules(["*"])).toBe(true);
  });

  it("resolves report sub-nav active path", () => {
    expect(resolveReportCenterSubNavPath("/admin/reports/center")).toBe("/admin/reports/center");
    expect(resolveReportCenterSubNavPath("/admin/reports/templates/foo")).toBe(
      "/admin/reports/templates",
    );
    expect(resolveReportCenterSubNavPath("/admin/reports/view/tpl-1")).toBe(
      "/admin/reports/templates",
    );
    expect(resolveReportCenterSubNavPath("/admin/reports/schedules")).toBe(
      "/admin/reports/schedules",
    );
    expect(resolveReportCenterSubNavPath("/admin/reports")).toBe("/admin/reports");
  });
});

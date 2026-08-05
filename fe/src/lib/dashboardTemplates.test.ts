import { describe, expect, it } from "vitest";
import {
  buildVizLayoutEnvelope,
  filterTemplatesForHub,
  type DashboardTemplateListItem,
} from "./dashboardTemplates";
import type { DashboardLayoutV1 } from "@/components/dashboard/layoutUtils";

function mockTemplate(
  overrides: Partial<DashboardTemplateListItem> & Pick<DashboardTemplateListItem, "templateKey" | "name">,
): DashboardTemplateListItem {
  return {
    id: "tpl-mock",
    description: null,
    categoryKey: "general",
    surfaceKind: "dashboard",
    status: "published",
    thumbnailRef: null,
    visibility: "builtin",
    ownerUserId: null,
    contentRevision: 1,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("filterTemplatesForHub", () => {
  it("removes builtin blank screen and dashboard templates", () => {
    const items = [
      mockTemplate({ templateKey: "builtin-screen-blank", name: "空白大屏", surfaceKind: "data-screen" }),
      mockTemplate({ templateKey: "builtin-dash-blank", name: "空白看板" }),
      mockTemplate({ templateKey: "builtin-viz-component-gallery", name: "官方组件验收大屏", surfaceKind: "data-screen" }),
      mockTemplate({ templateKey: "builtin-dash-dual-kpi", name: "双栏 KPI 分析" }),
    ];
    const filtered = filterTemplatesForHub(items);
    expect(filtered.map((item) => item.templateKey)).toEqual(["builtin-dash-dual-kpi"]);
  });

  it("keeps non-blank templates unchanged", () => {
    const items = [
      mockTemplate({ templateKey: "builtin-gov-smart-city", name: "智慧城市", surfaceKind: "data-screen" }),
    ];
    expect(filterTemplatesForHub(items)).toEqual(items);
  });
});

describe("buildVizLayoutEnvelope", () => {
  it("wraps dashboard layout in viz-layout envelope", () => {
    const layout: DashboardLayoutV1 = {
      version: 1,
      widgets: [],
      globalFilters: [],
    };
    const envelope = buildVizLayoutEnvelope(layout, "双栏 KPI", "dashboard");
    expect(envelope.templateVersion).toBe(1);
    expect(envelope.kind).toBe("viz-layout");
    expect(envelope.surfaceKind).toBe("dashboard");
    expect(envelope.name).toBe("双栏 KPI");
    expect(envelope.layout).toEqual(layout);
  });
});

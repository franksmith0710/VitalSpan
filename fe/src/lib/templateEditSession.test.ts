import { describe, expect, it } from "vitest";
import {
  buildTemplateEditSyncState,
  readTemplateEditSyncState,
} from "./templateEditSession";
import type { DashboardTemplateListItem } from "./dashboardTemplates";

function mockItem(
  overrides: Partial<DashboardTemplateListItem> = {},
): DashboardTemplateListItem {
  return {
    id: "tpl-1",
    templateKey: "tmpl-custom",
    name: "自定义模板",
    description: null,
    categoryKey: "general",
    surfaceKind: "dashboard",
    status: "draft",
    thumbnailRef: null,
    visibility: "org",
    contentRevision: 3,
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    ...overrides,
  };
}

describe("templateEditSession", () => {
  it("marks builtin templates read-only for non-managers", () => {
    const state = buildTemplateEditSyncState(
      mockItem({ visibility: "builtin", templateKey: "builtin-dash-ops" }),
      false,
    );
    expect(state.writable).toBe(false);
    expect(state.templateId).toBe("tpl-1");
  });

  it("allows managers to sync builtin templates", () => {
    expect(
      buildTemplateEditSyncState(
        mockItem({ visibility: "builtin", templateKey: "builtin-dash-ops" }),
        true,
      ).writable,
    ).toBe(true);
  });

  it("marks org/private templates as writable", () => {
    expect(buildTemplateEditSyncState(mockItem({ visibility: "org" }), false).writable).toBe(true);
    expect(buildTemplateEditSyncState(mockItem({ visibility: "private" }), false).writable).toBe(
      true,
    );
  });

  it("reads navigate state payload", () => {
    const payload = buildTemplateEditSyncState(mockItem(), true);
    expect(readTemplateEditSyncState(payload)).toEqual(payload);
    expect(readTemplateEditSyncState({ templateId: "x" })).toBeNull();
  });
});

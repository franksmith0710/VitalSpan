import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  resolveTemplateThumbnail,
  statusLabel,
  surfaceLabel,
  visibilityLabel,
} from "./templateLabels";

describe("templateLabels", () => {
  it("maps surface kinds", () => {
    expect(surfaceLabel("dashboard")).toBe("仪表板");
    expect(surfaceLabel("data-screen")).toBe("数据大屏");
  });

  it("maps template status", () => {
    expect(statusLabel("draft")).toBe("草稿");
    expect(statusLabel("published")).toBe("已发布");
    expect(statusLabel("archived")).toBe("已归档");
  });

  it("maps visibility", () => {
    expect(visibilityLabel("builtin")).toBe("内置");
    expect(visibilityLabel("org")).toBe("组织");
    expect(visibilityLabel("private")).toBe("私有");
  });

  it("resolves category labels", () => {
    expect(categoryLabel("general")).toBe("通用");
    expect(categoryLabel("monitoring")).toBe("监控");
    expect(categoryLabel("unknown")).toBe("unknown");
  });

  it("resolves builtin template thumbnails", () => {
    expect(resolveTemplateThumbnail("builtin-dash-blank", null)).toBe(
      "/template-assets/thumbs/dash-blank.svg",
    );
    expect(resolveTemplateThumbnail("custom", "/custom.png")).toBe("/custom.png");
  });
});

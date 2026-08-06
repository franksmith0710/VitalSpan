import { describe, expect, it } from "vitest";
import {
  filterTemplateAssetsByScope,
  galleryPreviewUrl,
  isGalleryEligibleAsset,
  TEMPLATE_ASSET_CATALOG,
} from "./templateAssetCatalog";

describe("templateAssetCatalog", () => {
  it("loads generated catalog with urls", () => {
    expect(TEMPLATE_ASSET_CATALOG.length).toBeGreaterThan(100);
    expect(TEMPLATE_ASSET_CATALOG[0]?.url).toMatch(/^\/template-assets\//);
  });

  it("excludes thumb and deprecated dashboard categories from canvas gallery", () => {
    const canvas = filterTemplateAssetsByScope("canvas");
    expect(canvas.some((item) => item.category === "thumb")).toBe(false);
    expect(canvas.some((item) => item.category === "canvas-thumb")).toBe(false);
    expect(canvas.some((item) => item.category === "dashboard-template")).toBe(false);
    expect(canvas.some((item) => item.category === "dashboard-variant")).toBe(false);
    expect(canvas.some((item) => item.category === "canvas-dark")).toBe(true);
    expect(canvas.some((item) => item.category === "title-strip")).toBe(false);
  });

  it("includes top decoration assets in screen gallery scope", () => {
    const screen = filterTemplateAssetsByScope("screen");
    expect(screen.some((item) => item.category === "title-strip")).toBe(true);
    expect(screen.some((item) => item.category === "screen-header")).toBe(true);
    expect(screen.some((item) => item.category === "canvas-dark")).toBe(true);
  });

  it("uses full background url when thumb is under /thumbs/", () => {
    const wireframe = TEMPLATE_ASSET_CATALOG.find((item) => item.id === "gov-grid");
    expect(wireframe).toBeDefined();
    expect(galleryPreviewUrl(wireframe!)).toBe(wireframe!.url);
    expect(galleryPreviewUrl(wireframe!).includes("/thumbs/")).toBe(false);
  });

  it("marks excluded categories as ineligible", () => {
    const thumb = TEMPLATE_ASSET_CATALOG.find((item) => item.category === "thumb");
    expect(thumb).toBeDefined();
    expect(isGalleryEligibleAsset(thumb!)).toBe(false);
  });
});

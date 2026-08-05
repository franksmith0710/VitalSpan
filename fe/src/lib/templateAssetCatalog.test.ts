import { describe, expect, it } from "vitest";
import { TEMPLATE_ASSET_CATALOG } from "./templateAssetCatalog";

describe("templateAssetCatalog", () => {
  it("loads generated catalog with urls", () => {
    expect(TEMPLATE_ASSET_CATALOG.length).toBeGreaterThan(100);
    expect(TEMPLATE_ASSET_CATALOG[0]?.url).toMatch(/^\/template-assets\//);
  });
});

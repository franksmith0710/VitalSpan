import { describe, expect, it } from "vitest";
import { normalizeCatalogNodes } from "./reportCatalogUtils";

describe("reportCatalogUtils", () => {
  it("normalizeCatalogNodes accepts array or items wrapper", () => {
    const node = {
      id: "1",
      name: "n",
      parentId: null,
      nodeType: "template" as const,
      templateKind: "pdf" as const,
      templateKey: "k",
      sortOrder: 0,
    };
    expect(normalizeCatalogNodes([node])).toHaveLength(1);
    expect(normalizeCatalogNodes({ items: [node] })).toHaveLength(1);
  });
});

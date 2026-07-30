import { describe, expect, it } from "vitest";
import { filterCatalogTemplates, normalizeCatalogNodes } from "./reportCatalogUtils";

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

  it("filterCatalogTemplates filters by name and kind", () => {
    const nodes = [
      {
        id: "1",
        name: "月报 PDF",
        parentId: null,
        nodeType: "template" as const,
        templateKind: "pdf" as const,
        templateKey: "monthly",
        sortOrder: 0,
      },
      {
        id: "2",
        name: "台账 Excel",
        parentId: null,
        nodeType: "template" as const,
        templateKind: "excel" as const,
        templateKey: "ledger",
        sortOrder: 1,
      },
    ];
    expect(filterCatalogTemplates(nodes, "月报", "all")).toHaveLength(1);
    expect(filterCatalogTemplates(nodes, "", "excel")).toHaveLength(1);
    expect(filterCatalogTemplates(nodes, "ledger", "all")).toHaveLength(1);
  });
});

import type { ChartTypeCatalogItem } from "@/lib/chartRegistry";

/** 对标 DataEase 组件库分区标题（展示层，不改后端 category） */
export type DePaletteSectionDef = {
  id: string;
  label: string;
  types: string[];
};

export const DE_PALETTE_SECTIONS: readonly DePaletteSectionDef[] = [
  { id: "indicator", label: "指标", types: ["kpi", "gauge"] },
  { id: "table", label: "表格", types: ["table"] },
  { id: "line", label: "线/面图", types: ["line"] },
  { id: "bar", label: "柱/条图", types: ["bar"] },
  { id: "dist", label: "分布图", types: ["pie", "funnel"] },
  { id: "map", label: "地图", types: ["map", "heatmap"] },
  { id: "relation", label: "关系图", types: ["graph", "sankey"] },
  { id: "temporal", label: "时序", types: ["timeline"] },
] as const;

export type DePaletteSection = {
  id: string;
  label: string;
  items: ChartTypeCatalogItem[];
};

export function buildDeStylePaletteSections(
  items: ChartTypeCatalogItem[],
): DePaletteSection[] {
  const byType = new Map(items.map((item) => [item.type, item]));
  const used = new Set<string>();
  const sections: DePaletteSection[] = [];

  for (const section of DE_PALETTE_SECTIONS) {
    const sectionItems = section.types
      .map((type) => byType.get(type))
      .filter((item): item is ChartTypeCatalogItem => item != null);
    for (const item of sectionItems) used.add(item.type);
    if (sectionItems.length > 0) {
      sections.push({ id: section.id, label: section.label, items: sectionItems });
    }
  }

  const orphans = items.filter((item) => !used.has(item.type));
  if (orphans.length > 0) {
    sections.push({ id: "more", label: "更多", items: orphans });
  }

  return sections;
}

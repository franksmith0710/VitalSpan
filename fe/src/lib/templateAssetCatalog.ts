import catalog from "./templateAssetsCatalog.generated.json";

export type TemplateAssetCatalogItem = {
  id: string;
  pack: string;
  category: string;
  palette: string;
  pattern: string;
  label: string;
  url: string;
  thumbUrl: string;
};

export type TemplateAssetGalleryScope = "widget" | "canvas" | "all";

export const TEMPLATE_ASSET_CATALOG = catalog.items as TemplateAssetCatalogItem[];

export const TEMPLATE_ASSET_CATEGORY_LABELS: Record<string, string> = {
  "borderless-decor": "无边框装饰",
  "screen-header": "顶栏条",
  "canvas-dark": "大屏深色",
  "canvas-light": "大屏浅色",
  "canvas-thumb": "画布预览",
  "dashboard-template": "仪表板",
  "dashboard-variant": "仪表板变体",
  "screen-bg": "背景图",
  thumb: "缩略图",
};

const CANVAS_CATEGORIES = new Set([
  "canvas-dark",
  "canvas-light",
  "canvas-thumb",
  "dashboard-template",
  "dashboard-variant",
  "screen-bg",
  "thumb",
]);

const WIDGET_CATEGORIES = new Set(["borderless-decor", "screen-header"]);

export function listTemplateAssetCategories(
  items: TemplateAssetCatalogItem[] = TEMPLATE_ASSET_CATALOG,
): string[] {
  return [...new Set(items.map((item) => item.category))].sort((a, b) => {
    const order = [
      "borderless-decor",
      "screen-header",
      "canvas-dark",
      "canvas-light",
      "dashboard-template",
      "screen-bg",
    ];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
      (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });
}

export function filterTemplateAssetsByScope(
  scope: TemplateAssetGalleryScope,
  items: TemplateAssetCatalogItem[] = TEMPLATE_ASSET_CATALOG,
): TemplateAssetCatalogItem[] {
  if (scope === "all") return items;
  if (scope === "canvas") {
    return items.filter((item) => CANVAS_CATEGORIES.has(item.category));
  }
  return items.filter(
    (item) =>
      WIDGET_CATEGORIES.has(item.category) ||
      item.category.startsWith("canvas-") ||
      item.category === "screen-bg",
  );
}

export function groupTemplateAssetsByCategory(items: TemplateAssetCatalogItem[]) {
  const map = new Map<string, TemplateAssetCatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

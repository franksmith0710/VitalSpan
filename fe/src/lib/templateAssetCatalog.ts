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

export type TemplateAssetGalleryScope = "widget" | "canvas" | "screen" | "all";

export const TEMPLATE_ASSET_CATALOG = catalog.items as TemplateAssetCatalogItem[];

export const TEMPLATE_ASSET_CATEGORY_LABELS: Record<string, string> = {
  "borderless-decor": "无边框装饰",
  "screen-header": "顶栏整图",
  "title-strip": "顶部装饰",
  "canvas-dark": "大屏深色",
  "canvas-light": "大屏浅色",
  "screen-bg": "背景图",
};

/** 图库不展示：缩略图、废弃仪表板线框、变体预览等 */
export const GALLERY_EXCLUDED_CATEGORIES = new Set([
  "thumb",
  "canvas-thumb",
  "dashboard-template",
  "dashboard-variant",
]);

const CANVAS_CATEGORIES = new Set(["canvas-dark", "canvas-light", "screen-bg"]);

const TOP_DECOR_CATEGORIES = new Set(["title-strip", "screen-header"]);

const SCREEN_GALLERY_CATEGORIES = new Set([...CANVAS_CATEGORIES, ...TOP_DECOR_CATEGORIES]);

const WIDGET_CATEGORIES = new Set(["borderless-decor", "screen-header", "title-strip"]);

export function isGalleryEligibleAsset(item: TemplateAssetCatalogItem): boolean {
  return !GALLERY_EXCLUDED_CATEGORIES.has(item.category);
}

/** 图库格子预览：优先真实背景图，不用 /thumbs/ 线框缩略图 */
export function galleryPreviewUrl(item: TemplateAssetCatalogItem): string {
  const thumb = item.thumbUrl?.trim() ?? "";
  if (thumb && !thumb.includes("/thumbs/")) return thumb;
  return item.url;
}

function applyGalleryExclusions(items: TemplateAssetCatalogItem[]): TemplateAssetCatalogItem[] {
  return items.filter(isGalleryEligibleAsset);
}

export function listTemplateAssetCategories(
  items: TemplateAssetCatalogItem[] = TEMPLATE_ASSET_CATALOG,
): string[] {
  const eligible = applyGalleryExclusions(items);
  return [...new Set(eligible.map((item) => item.category))].sort((a, b) => {
    const order = [
      "title-strip",
      "screen-header",
      "borderless-decor",
      "canvas-dark",
      "canvas-light",
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
  const eligible = applyGalleryExclusions(items);
  if (scope === "all") return eligible;
  if (scope === "canvas") {
    return eligible.filter((item) => CANVAS_CATEGORIES.has(item.category));
  }
  if (scope === "screen") {
    return eligible.filter((item) => SCREEN_GALLERY_CATEGORIES.has(item.category));
  }
  return eligible.filter(
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

export function findTemplateAssetByUrl(
  url: string,
  items: TemplateAssetCatalogItem[] = TEMPLATE_ASSET_CATALOG,
): TemplateAssetCatalogItem | undefined {
  const normalized = url.trim();
  if (!normalized) return undefined;
  return items.find((item) => item.url === normalized || item.thumbUrl === normalized);
}

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Filter,
  Image,
  Type,
} from "lucide-react";
import {
  VIZ_COMPONENT_CATEGORIES,
  type VizComponentListItem,
  type VizSurfaceKind,
  type VizWidgetType,
} from "@/lib/vizComponents";

export const VIZ_COMPONENTS_HUB = {
  title: "可视化组件库",
  description: "管理可复用的图表、筛选器与装饰组件；在看板/大屏编辑页通过「复用」插入并自动同步更新。",
  searchPlaceholder: "搜索组件名称…",
  searchAriaLabel: "搜索组件",
  allCategories: "全部分类",
  allSurfaces: "全部场景",
  emptyTitle: "暂无组件",
  emptyDescription: "从看板或大屏编辑页将组件发布到组织库后，可在此统一管理并在多处复用。",
  layoutTemplates: "布局模板",
  goEditDashboard: "去编辑看板",
  goEditDataScreen: "去编辑大屏",
  insertToDashboard: "插入到看板",
  edit: "编辑",
  viewReferences: "查看引用",
  reuseHint: "编辑页「复用」",
  toastPublished: "组件已发布",
  toastArchived: "组件已下架",
  toastDeleted: "组件已删除",
} as const;

export const COMPONENT_ACTIONS = {
  publish: "发布",
  archive: "下架",
  delete: "删除",
  reuse: "在编辑页复用",
  insert: "插入到看板",
  edit: "编辑",
  references: "查看引用",
} as const;

export const SURFACE_TABS: { key: VizSurfaceKind | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "dashboard", label: "仪表板" },
  { key: "data-screen", label: "数据大屏" },
];

export const WIDGET_TYPE_FILTERS: { key: VizWidgetType | "all"; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "全部类型", icon: BarChart3 },
  { key: "chart", label: "图表", icon: BarChart3 },
  { key: "filter", label: "筛选器", icon: Filter },
  { key: "text", label: "富文本", icon: Type },
  { key: "media", label: "媒体", icon: Image },
];

export const CATEGORY_ACCENT: Record<string, string> = {
  general: "from-brand-500/80 to-brand-400/40",
  monitoring: "from-cyan-500/80 to-sky-400/40",
  government: "from-indigo-500/80 to-violet-400/40",
  analytics: "from-violet-500/80 to-purple-400/40",
};

export function surfaceLabel(kind: VizSurfaceKind): string {
  return kind === "data-screen" ? "数据大屏" : "仪表板";
}

export function widgetTypeLabel(type: VizWidgetType): string {
  switch (type) {
    case "chart":
      return "图表";
    case "filter":
      return "筛选器";
    case "text":
      return "富文本";
    case "media":
      return "媒体";
    default:
      return type;
  }
}

export function statusLabel(status: VizComponentListItem["status"]): string {
  switch (status) {
    case "draft":
      return "草稿";
    case "published":
      return "已发布";
    case "archived":
      return "已归档";
    default:
      return status;
  }
}

export function visibilityLabel(visibility: VizComponentListItem["visibility"]): string {
  return visibility === "org" ? "组织" : "私有";
}

export function categoryLabel(key: string): string {
  return VIZ_COMPONENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export { VIZ_COMPONENT_CATEGORIES };

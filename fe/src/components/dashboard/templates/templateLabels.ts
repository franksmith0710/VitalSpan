import {
  TEMPLATE_CATEGORIES,
  type DashboardTemplateListItem,
  type VizSurfaceKind,
} from "@/lib/dashboardTemplates";

export const VIZ_TEMPLATES_HUB = {
  title: "可视化模板",
  description:
    "企业内看板与大屏布局模板库；内置模板绑定 sample_db 演示数据（v_sales_geo / daily_kpi），需先配置演示数据源。",
  importJson: "导入 JSON",
  searchPlaceholder: "搜索模板名称…",
  searchAriaLabel: "搜索模板",
  allCategories: "全部分类",
  emptyTitle: "暂无模板",
  emptyDescription: "当前筛选条件下没有可用模板，可尝试切换分类或导入 JSON 创建。",
  toastPublished: "模板已发布",
  toastArchived: "模板已下架",
  toastImported: "模板导入成功",
  toastExportFailed: "导出失败",
  toastExported: "模板 JSON 已下载",
  invalidJson: "无法解析 JSON 文件",
} as const;

export const TEMPLATE_ACTIONS = {
  use: "使用模板",
  preview: "预览",
  export: "导出",
  publish: "发布",
  archive: "下架",
  exportTemplate: "导出模板",
  publishAsTemplate: "发布为模板",
  layoutJson: "布局 JSON",
  templateSection: "模板",
  exportSection: "导出",
} as const;

export const SURFACE_TABS: { key: VizSurfaceKind; label: string }[] = [
  { key: "dashboard", label: "仪表板" },
  { key: "data-screen", label: "数据大屏" },
];

export function surfaceLabel(kind: VizSurfaceKind): string {
  return kind === "data-screen" ? "数据大屏" : "仪表板";
}

export function statusLabel(status: DashboardTemplateListItem["status"]): string {
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

export function visibilityLabel(
  visibility: DashboardTemplateListItem["visibility"],
): string | null {
  switch (visibility) {
    case "builtin":
      return "内置";
    case "org":
      return "组织";
    case "private":
      return "私有";
    default:
      return null;
  }
}

export function categoryLabel(key: string): string {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function templatePreviewAspectRatio(surfaceKind: VizSurfaceKind): string {
  return surfaceKind === "data-screen" ? "16 / 9" : "4 / 3";
}

/** 内置模板缩略图（public 静态资源） */
export const BUILTIN_TEMPLATE_THUMBS: Record<string, string> = {
  "builtin-screen-blank": "/template-assets/thumbs/screen-blank.svg",
  "builtin-screen-command-center": "/template-assets/thumbs/screen-command-center.svg",
  "builtin-screen-tech-blue": "/template-assets/thumbs/screen-tech-blue.svg",
  "builtin-screen-gov-minimal": "/template-assets/thumbs/screen-gov-minimal.svg",
  "builtin-screen-sales-geo": "/template-assets/thumbs/screen-sales-geo.svg",
  "builtin-dash-blank": "/template-assets/thumbs/dash-blank.svg",
  "builtin-dash-dual-kpi": "/template-assets/thumbs/dash-dual-kpi.svg",
  "builtin-dash-triple-analysis": "/template-assets/thumbs/dash-triple-analysis.svg",
  "builtin-dash-ops": "/template-assets/thumbs/dash-ops.svg",
};

export const CATEGORY_ACCENT: Record<string, string> = {
  general: "from-brand-500/80 to-brand-400/40",
  monitoring: "from-cyan-500/80 to-sky-400/40",
  government: "from-indigo-500/80 to-violet-400/40",
  analytics: "from-violet-500/80 to-purple-400/40",
};

export function resolveTemplateThumbnail(
  templateKey: string,
  thumbnailRef?: string | null,
): string | null {
  return thumbnailRef ?? BUILTIN_TEMPLATE_THUMBS[templateKey] ?? null;
}

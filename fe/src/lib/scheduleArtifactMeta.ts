export type ScheduleArtifactKind = "layout_inventory" | "visual_snapshot" | "template_render" | (string & {});

const ARTIFACT_KIND_LABELS: Record<string, string> = {
  layout_inventory: "布局摘要",
  visual_snapshot: "可视化快照",
  template_render: "报表渲染",
  standard_render: "标准分析报告",
};

export function localizeArtifactKind(kind: string | null | undefined): string | null {
  if (!kind) return null;
  return ARTIFACT_KIND_LABELS[kind] ?? kind;
}

export function isLayoutInventoryArtifact(kind: string | null | undefined): boolean {
  return kind === "layout_inventory";
}

export const LAYOUT_INVENTORY_NOTICE =
  "历史记录为布局摘要附件（升级前产物）；新执行的看板定时报告将投递可视化快照 PDF。";

export const VISUAL_SNAPSHOT_CREATE_NOTICE =
  "新建定时报告将生成「可视化快照」PDF（Playwright 渲染当前画布）。若环境未就绪，预检会阻断创建；执行历史中「布局摘要」仅表示升级前产物。";

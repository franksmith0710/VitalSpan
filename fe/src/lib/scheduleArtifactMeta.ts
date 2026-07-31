export type ScheduleArtifactKind = "layout_inventory" | "template_render" | (string & {});

const ARTIFACT_KIND_LABELS: Record<string, string> = {
  layout_inventory: "布局摘要",
  template_render: "报表渲染",
};

export function localizeArtifactKind(kind: string | null | undefined): string | null {
  if (!kind) return null;
  return ARTIFACT_KIND_LABELS[kind] ?? kind;
}

export function isLayoutInventoryArtifact(kind: string | null | undefined): boolean {
  return kind === "layout_inventory";
}

export const LAYOUT_INVENTORY_NOTICE =
  "当前附件为看板/大屏组件布局摘要（PDF/CSV 清单），非图表渲染快照；完整可视化导出能力规划中。";

import type { DashboardTemplateListItem } from "@/lib/dashboardTemplates";

export type TemplateEditSyncState = {
  templateId: string;
  templateName: string;
  contentRevision: number;
  /** 内置模板只读，保存仅作用于临时看板副本 */
  writable: boolean;
};

export function buildTemplateEditSyncState(
  item: DashboardTemplateListItem,
  canManageTemplates: boolean,
): TemplateEditSyncState {
  const writable = item.visibility !== "builtin" || canManageTemplates;
  return {
    templateId: item.id,
    templateName: item.name,
    contentRevision: item.contentRevision,
    writable,
  };
}

export function readTemplateEditSyncState(state: unknown): TemplateEditSyncState | null {
  if (!state || typeof state !== "object") return null;
  const raw = state as Partial<TemplateEditSyncState>;
  if (
    typeof raw.templateId === "string" &&
    typeof raw.templateName === "string" &&
    typeof raw.contentRevision === "number" &&
    typeof raw.writable === "boolean"
  ) {
    return {
      templateId: raw.templateId,
      templateName: raw.templateName,
      contentRevision: raw.contentRevision,
      writable: raw.writable,
    };
  }
  return null;
}

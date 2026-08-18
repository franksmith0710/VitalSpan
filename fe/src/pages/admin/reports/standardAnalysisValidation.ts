import type { AnalysisPack, AnalysisTheme, FieldMapping } from "./useStandardAnalysis";
import { THEME_LABELS } from "./standardRoutes";

const THEME_FIELD_REQUIREMENTS: Record<AnalysisTheme, { key: keyof FieldMapping; label: string }> = {
  lifecycle: { key: "status", label: "状态" },
  distribution: { key: "region", label: "区域" },
  activity: { key: "createdAt", label: "时间" },
  trend: { key: "createdAt", label: "时间" },
};

const FIELD_CANDIDATES: Record<keyof FieldMapping, string[]> = {
  status: ["status", "state"],
  region: ["region", "area", "city", "province"],
  createdAt: ["created_at", "createdat", "create_time", "updated_at", "event_time"],
};

function columnLookup(columns: string[]): Map<string, string> {
  return new Map(columns.map((column) => [column.toLowerCase(), column]));
}

export function suggestStandardFieldMapping(columns: string[]): FieldMapping {
  const lookup = columnLookup(columns);
  const pick = (candidates: string[]) => {
    for (const candidate of candidates) {
      const hit = lookup.get(candidate.toLowerCase());
      if (hit) return hit;
    }
    return "";
  };
  return {
    status: pick(FIELD_CANDIDATES.status),
    region: pick(FIELD_CANDIDATES.region),
    createdAt: pick(FIELD_CANDIDATES.createdAt),
  };
}

export function mergeSuggestedFieldMapping(
  current: FieldMapping,
  columns: string[],
): FieldMapping {
  if (columns.length === 0) return current;
  const suggested = suggestStandardFieldMapping(columns);
  return {
    status: current.status || suggested.status || "",
    region: current.region || suggested.region || "",
    createdAt: current.createdAt || suggested.createdAt || "",
  };
}

export function validateStandardPackDraft(
  draft: AnalysisPack,
  columnOptions: string[],
): string | null {
  const colSet = new Set(columnOptions.map((column) => column.toLowerCase()));

  for (const theme of draft.enabledThemes) {
    const requirement = THEME_FIELD_REQUIREMENTS[theme];
    const mapped = draft.fieldMapping[requirement.key]?.trim();
    if (!mapped) {
      return `已启用「${THEME_LABELS[theme]}」主题，请在字段映射中配置${requirement.label}字段`;
    }
    if (columnOptions.length > 0 && !colSet.has(mapped.toLowerCase())) {
      return `「${THEME_LABELS[theme]}」所需的「${mapped}」不在当前数据集列中，请重新映射或更换数据集`;
    }
  }

  return null;
}

type Linkage = {
  filters: { filterId: string; dimensionRef: string; defaultValue?: string | null }[];
  linkageRules: { sourceFilterId: string; targetWidgetIds: string[]; parameterKey: string }[];
  refreshMode?: "eager" | "lazy";
};

const UNSAFE = /[;]|--|\/\*/;

export function injectSqlParameters(sql: string, params: Record<string, string>): string {
  return sql.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) return `{{${key}}}`;
    if (UNSAFE.test(value)) {
      throw new Error("筛选值包含非法字符，请修改后重试");
    }
    return value.replace(/'/g, "''");
  });
}

export function buildWidgetFilterParams(
  widgetId: string,
  linkage: Linkage,
  filterValues: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of linkage.linkageRules) {
    if (!rule.targetWidgetIds.includes(widgetId)) continue;
    const value = filterValues[rule.sourceFilterId];
    if (value !== undefined && value !== "") out[rule.parameterKey] = value;
  }
  return out;
}

export type { Linkage };

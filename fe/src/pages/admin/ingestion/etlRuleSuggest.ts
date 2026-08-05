export type EtlColumnMeta = {
  name: string;
  dataType?: string;
};

export type EtlRuleDraft = {
  type: string;
  [key: string]: string;
};

const NUMERIC_FLOAT_NAME =
  /(?:^|_)(amount|price|qty|quantity|total|cost|rate|weight|budget|spent|revenue|salary|fee|value|score|lat|lng|lon|latitude|longitude)(?:$|_)/i;
const NUMERIC_INT_NAME = /(?:^|_)(id|year|month|day|age|rank|seq|index|count|num)(?:$|_)/i;

function isStringLikeDataType(dataType: string | undefined): boolean {
  const dt = (dataType ?? "").toLowerCase();
  if (!dt) return true;
  return /char|text|json|blob|string|enum|set/.test(dt);
}

/** 根据源表列元数据生成建议清洗规则（保守：类型转换 + 常见 status 过滤）。 */
export function suggestEtlRulesFromColumns(columns: EtlColumnMeta[]): EtlRuleDraft[] {
  const rules: EtlRuleDraft[] = [];
  const seen = new Set<string>();

  for (const col of columns) {
    const name = col.name.trim();
    if (!name) continue;
    if (!isStringLikeDataType(col.dataType)) continue;

    let target: "float" | "integer" | null = null;
    if (NUMERIC_INT_NAME.test(name)) target = "integer";
    else if (NUMERIC_FLOAT_NAME.test(name)) target = "float";
    if (!target) continue;

    const key = `cast:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ type: "cast_type", column: name, to: target });
  }

  if (columns.some((col) => col.name.trim().toLowerCase() === "status")) {
    rules.push({ type: "filter_rows", column: "status", op: "ne", value: "deleted" });
  }

  return rules;
}

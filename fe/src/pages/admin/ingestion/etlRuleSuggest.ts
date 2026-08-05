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
const RENAME_NAME_SUFFIX = /^([a-z][a-z0-9_]*)_name$/i;
const FILL_NULL_NAME = /(?:^|_)(note|comment|remark|memo)(?:$|_)/i;
const FILL_NULL_DEFAULT = "无备注";

function isStringLikeDataType(dataType: string | undefined): boolean {
  const dt = (dataType ?? "").toLowerCase();
  if (!dt) return true;
  return /char|text|json|blob|string|enum|set/.test(dt);
}

/** 根据源表列元数据生成建议清洗规则（rename / fill_null / cast / status 过滤）。 */
export function suggestEtlRulesFromColumns(columns: EtlColumnMeta[]): EtlRuleDraft[] {
  const rules: EtlRuleDraft[] = [];
  const seen = new Set<string>();

  for (const col of columns) {
    const name = col.name.trim();
    if (!name) continue;

    const renameMatch = name.match(RENAME_NAME_SUFFIX);
    if (renameMatch) {
      const target = renameMatch[1];
      const key = `rename:${name}`;
      if (!seen.has(key) && target !== name) {
        seen.add(key);
        rules.push({ type: "rename_column", from: name, to: target });
      }
    }

    if (FILL_NULL_NAME.test(name)) {
      const key = `fill:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        rules.push({ type: "fill_null", column: name, value: FILL_NULL_DEFAULT });
      }
    }

    if (!isStringLikeDataType(col.dataType)) continue;

    let target: "float" | "integer" | null = null;
    if (NUMERIC_INT_NAME.test(name)) target = "integer";
    else if (NUMERIC_FLOAT_NAME.test(name)) target = "float";
    if (target) {
      const key = `cast:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        rules.push({ type: "cast_type", column: name, to: target });
      }
    }
  }

  if (columns.some((col) => col.name.trim().toLowerCase() === "status")) {
    rules.push({ type: "filter_rows", column: "status", op: "ne", value: "deleted" });
  }

  return rules;
}

export function summarizeEtlRules(rules: EtlRuleDraft[]): string {
  if (rules.length === 0) return "无清洗规则（原样入湖）";
  const parts: string[] = [];
  for (const rule of rules) {
    if (rule.type === "rename_column" && rule.from && rule.to) {
      parts.push(`${rule.from}→${rule.to}`);
    } else if (rule.type === "cast_type" && rule.column && rule.to) {
      parts.push(`${rule.column}→${rule.to}`);
    } else if (rule.type === "fill_null" && rule.column) {
      parts.push(`${rule.column} 填「${rule.value ?? ""}」`);
    } else if (rule.type === "filter_rows" && rule.column) {
      parts.push(`过滤 ${rule.column} ${rule.op ?? "ne"} ${rule.value ?? ""}`.trim());
    }
  }
  if (parts.length > 0) return parts.join("、");
  return `${rules.length} 条规则`;
}

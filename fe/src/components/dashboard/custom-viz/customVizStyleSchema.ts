export type StyleProperty = {
  type?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  title?: string;
};

export function readStyleSchemaProperties(
  styleSchema: Record<string, unknown> | undefined,
): Record<string, StyleProperty> {
  const props = styleSchema?.properties;
  if (!props || typeof props !== "object") return {};
  return props as Record<string, StyleProperty>;
}

/** manifest 未写 styleSchema 时，从 defaultStyle 键推断最小可编辑 schema。 */
export function inferStyleSchemaFromDefault(
  defaultStyle: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!defaultStyle || Object.keys(defaultStyle).length === 0) return undefined;
  const properties: Record<string, StyleProperty> = {};
  for (const [key, val] of Object.entries(defaultStyle)) {
    if (typeof val === "number") {
      properties[key] = { type: "number", title: key };
    } else if (typeof val === "string" && /^#/.test(val)) {
      properties[key] = { type: "string", format: "color", title: key };
    } else {
      properties[key] = { type: "string", title: key };
    }
  }
  return { type: "object", properties };
}

export function resolveCustomVizStyleSchema(
  styleSchema: Record<string, unknown> | undefined,
  defaultStyle: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (readStyleSchemaProperties(styleSchema) && Object.keys(readStyleSchemaProperties(styleSchema)).length > 0) {
    return styleSchema;
  }
  return inferStyleSchemaFromDefault(defaultStyle);
}

export function mergeCustomVizStyleValue(
  layoutStyle: Record<string, unknown> | undefined,
  defaultStyle: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(defaultStyle ?? {}), ...(layoutStyle ?? {}) };
}

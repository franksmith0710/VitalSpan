/** Parse `schema.table` or bare `table` from Dataset table name. */
export function parseQualifiedTable(name: string): { schema: string; table: string } {
  const trimmed = name.trim();
  const dot = trimmed.indexOf(".");
  if (dot === -1) return { schema: "", table: trimmed };
  return { schema: trimmed.slice(0, dot), table: trimmed.slice(dot + 1) };
}

function normalizeSchemaPart(schema: string | undefined): string {
  return (schema?.trim() || "public").toLowerCase();
}

function normalizeTablePart(table: string): string {
  return table.trim().toLowerCase();
}

/** Compare dataset table name with bind payload schema/table (lenient). */
export function tablesMatchForBind(
  datasetTableName: string,
  boundSchema?: string,
  boundTable?: string,
): boolean {
  if (!datasetTableName.trim()) return false;
  if (!boundTable?.trim()) return true;

  const datasetParsed = parseQualifiedTable(datasetTableName);
  const boundParsed = boundTable.includes(".")
    ? parseQualifiedTable(boundTable)
    : {
        schema: boundSchema?.trim() || "",
        table: boundTable.trim(),
      };

  return (
    normalizeTablePart(datasetParsed.table) === normalizeTablePart(boundParsed.table) &&
    normalizeSchemaPart(datasetParsed.schema) === normalizeSchemaPart(boundParsed.schema || boundSchema)
  );
}

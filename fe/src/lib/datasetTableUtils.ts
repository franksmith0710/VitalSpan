/** Parse `schema.table` or bare `table` from Dataset table name. */
export function parseQualifiedTable(name: string): { schema: string; table: string } {
  const trimmed = name.trim();
  const dot = trimmed.indexOf(".");
  if (dot === -1) return { schema: "", table: trimmed };
  return { schema: trimmed.slice(0, dot), table: trimmed.slice(dot + 1) };
}

import { isSyncSourceCapable } from "@/lib/datasourceRoles";

const MANUAL_SOURCE_TABLE_TYPES = new Set(["rest_api", "csv", "excel"]);

/** 是否可从连接元数据拉取源表/集合/索引列表。 */
export function supportsSyncSourceTablePicker(sourceType: string | undefined): boolean {
  if (!sourceType) return false;
  return isSyncSourceCapable(sourceType) && !MANUAL_SOURCE_TABLE_TYPES.has(sourceType);
}

export function resolveSyncSourceSchema(
  schemas: string[],
  preferredDatabase?: string,
): string {
  const db = preferredDatabase?.trim();
  if (db && schemas.includes(db)) return db;
  return schemas[0] ?? db ?? "";
}

/** 由源表名推导托管分析库 target_table，并在已有表名集合内保证唯一。 */

const DIRTY_ORDERS_SOURCE = "dirty_orders";
const ORDERS_CLEAN_TARGET = "orders_clean";

function sanitizeTableToken(raw: string): string {
  const token = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!token) return "sync_target";
  if (/^[0-9]/.test(token)) return `t_${token}`;
  return token.slice(0, 120);
}

/** 由源表推导基础目标表名（不含冲突后缀）。 */
export function baseTargetTableFromSource(sourceTable: string): string {
  const normalized = sourceTable.trim().toLowerCase();
  if (normalized === DIRTY_ORDERS_SOURCE) return ORDERS_CLEAN_TARGET;
  const base = sanitizeTableToken(sourceTable);
  if (base.endsWith("_clean")) return base;
  return `${base}_clean`;
}

/** 在 taken 集合中选取首个可用 target_table（冲突时追加 _2、_3…）。 */
export function suggestSyncTargetTable(
  sourceTable: string,
  takenTargets: Iterable<string> = [],
): string {
  const taken = new Set(Array.from(takenTargets).map((t) => t.trim().toLowerCase()).filter(Boolean));
  const base = baseTargetTableFromSource(sourceTable);
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i <= 99; i += 1) {
    const candidate = `${base}_${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}_${Date.now().toString(36).slice(-6)}`;
}

export function findJobsSharingTargetTable<
  T extends { id: string; name: string; target_table: string },
>(jobs: T[], targetTable: string, excludeJobId?: string): T[] {
  const needle = targetTable.trim().toLowerCase();
  if (!needle) return [];
  return jobs.filter(
    (job) =>
      job.target_table.trim().toLowerCase() === needle &&
      (!excludeJobId || job.id !== excludeJobId),
  );
}

/** 顺序执行单项删除；收集成功/失败数量（无批量 API 时的通用策略） */
export async function runBatchDelete<T extends string>(
  ids: Iterable<T>,
  deleteOne: (id: T) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await deleteOne(id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

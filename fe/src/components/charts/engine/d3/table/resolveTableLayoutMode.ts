import type { TableColumnWidthMode } from "@/lib/chartDeTableStyle";

/** 列数较多时避免等分压扁，改为按内容宽度 + 横向滚动（对标 DataEase 明细表） */
export const AUTO_EQUAL_SPLIT_MAX_COLUMNS = 4;

export function resolveEffectiveColumnWidthMode(
  mode: TableColumnWidthMode | undefined,
  columnCount: number,
): TableColumnWidthMode {
  const resolved = mode ?? "auto";
  if (resolved === "auto" && columnCount > AUTO_EQUAL_SPLIT_MAX_COLUMNS) return "fixed";
  return resolved;
}

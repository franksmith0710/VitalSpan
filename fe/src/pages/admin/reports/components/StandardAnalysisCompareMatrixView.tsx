import { DataTable, ListPageFooter, ListPageTableFrame } from "@/components/layout/list-page-kit";
import type { CompareMatrixResult } from "../useStandardAnalysis";
import {
  STANDARD_COMPARE_TABLE_MAX_HEIGHT,
  standardCompareTableScrollHint,
} from "./standardAnalysisTableUi";

type Props = {
  matrixData?: CompareMatrixResult;
  isLoading: boolean;
};

export function StandardAnalysisCompareMatrixView({ matrixData, isLoading }: Props) {
  const periodKeys = matrixData?.periodKeys ?? [];
  const rowCount = matrixData?.rows.length ?? 0;
  const headers = ["维度", ...periodKeys];
  const scrollHint = standardCompareTableScrollHint(rowCount);

  return (
    <ListPageTableFrame className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-0">
      <DataTable
        loading={isLoading}
        empty={!isLoading && rowCount === 0}
        headers={headers}
        maxBodyHeight={rowCount > 0 ? STANDARD_COMPARE_TABLE_MAX_HEIGHT : undefined}
        rows={(matrixData?.rows ?? []).map((row) => [
          <span key={`${row.key}-dim`} className="font-medium text-gray-800 dark:text-white/90">
            {row.key}
          </span>,
          ...periodKeys.map((periodKey) => (
            <span key={`${row.key}-${periodKey}`} className="tabular-nums">
              {row.values[periodKey] ?? "—"}
            </span>
          )),
        ])}
        emptyState={{
          icon: null,
          title: "暂无可对比数据",
          description: "请至少选择 2 个周期，并确保对应快照已保存。",
        }}
      />
      {matrixData && !isLoading ? (
        <ListPageFooter>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            共 {periodKeys.length} 个周期 · {rowCount} 个维度
            {scrollHint ? ` · ${scrollHint}` : ""}
          </p>
        </ListPageFooter>
      ) : null}
    </ListPageTableFrame>
  );
}

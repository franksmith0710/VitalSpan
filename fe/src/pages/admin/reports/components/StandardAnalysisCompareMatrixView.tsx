import { DataTable, ListPageFooter, ListPageTableFrame } from "@/components/layout/list-page-kit";
import type { CompareMatrixResult } from "../useStandardAnalysis";

type Props = {
  matrixData?: CompareMatrixResult;
  isLoading: boolean;
};

export function StandardAnalysisCompareMatrixView({ matrixData, isLoading }: Props) {
  const periodKeys = matrixData?.periodKeys ?? [];
  const headers = ["维度", ...periodKeys];

  return (
    <ListPageTableFrame className="flex min-h-0 flex-1 flex-col">
      <DataTable
        loading={isLoading}
        empty={!isLoading && (matrixData?.rows.length ?? 0) === 0}
        headers={headers}
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
            共 {periodKeys.length} 个周期 · {matrixData.rows.length} 个维度
          </p>
        </ListPageFooter>
      ) : null}
    </ListPageTableFrame>
  );
}

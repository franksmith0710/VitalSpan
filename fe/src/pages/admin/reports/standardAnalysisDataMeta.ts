export type StandardAnalysisRenderMeta = {
  sourceRowCount?: number;
  aggregatedPointCount?: number;
  queryLimit?: number;
  timeStep?: "daily" | "weekly" | "monthly" | null;
  timeStepLabel?: string | null;
  topN?: number | null;
  topNTruncated?: boolean;
  pointCap?: number | null;
  pointCapApplied?: boolean;
  sampleBased?: boolean;
};

function formatCount(value: number | undefined): string | null {
  if (value === undefined || Number.isNaN(value)) return null;
  return value.toLocaleString("zh-CN");
}

export function buildStandardAnalysisDataMetaNote(meta: StandardAnalysisRenderMeta | undefined): string | null {
  if (!meta) return null;

  const parts: string[] = [];
  const sourceRows = formatCount(meta.sourceRowCount);
  const queryLimit = formatCount(meta.queryLimit);

  if (meta.sampleBased && sourceRows) {
    if (queryLimit && meta.sourceRowCount !== undefined && meta.sourceRowCount >= (meta.queryLimit ?? 0)) {
      parts.push(`基于 ${sourceRows} 行样本聚合（已达查询上限 ${queryLimit} 行）`);
    } else {
      parts.push(`基于 ${sourceRows} 行样本聚合`);
    }
  } else if (sourceRows) {
    parts.push(`共 ${sourceRows} 行`);
  }

  if (meta.timeStepLabel) {
    parts.push(`${meta.timeStepLabel}展示`);
  }

  if (meta.topN && meta.topNTruncated) {
    parts.push(`维度 Top ${meta.topN}（其余合并为「其他」）`);
  } else if (meta.topN) {
    parts.push(`展示前 ${meta.topN} 项`);
  }

  if (meta.pointCapApplied && meta.pointCap) {
    parts.push(`仅保留最近 ${meta.pointCap} 个时间点`);
  }

  return parts.length > 0 ? parts.join("，") + "。" : null;
}

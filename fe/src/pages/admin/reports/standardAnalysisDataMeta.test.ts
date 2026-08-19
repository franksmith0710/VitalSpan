import { describe, expect, it } from "vitest";
import { buildStandardAnalysisDataMetaNote } from "./standardAnalysisDataMeta";

describe("buildStandardAnalysisDataMetaNote", () => {
  it("returns null when meta is absent", () => {
    expect(buildStandardAnalysisDataMetaNote(undefined)).toBeNull();
  });

  it("describes sample-based distribution with top N truncation", () => {
    const note = buildStandardAnalysisDataMetaNote({
      sampleBased: true,
      sourceRowCount: 3200,
      queryLimit: 5000,
      topN: 20,
      topNTruncated: true,
    });
    expect(note).toBe("基于 3,200 行样本聚合，维度 Top 20（其余合并为「其他」）。");
  });

  it("describes weekly time series with point cap", () => {
    const note = buildStandardAnalysisDataMetaNote({
      sampleBased: true,
      sourceRowCount: 5000,
      queryLimit: 5000,
      timeStepLabel: "按周",
      pointCap: 52,
      pointCapApplied: true,
    });
    expect(note).toBe(
      "基于 5,000 行样本聚合（已达查询上限 5,000 行），按周展示，仅保留最近 52 个时间点。",
    );
  });

  it("describes query limit reached without other hints", () => {
    const note = buildStandardAnalysisDataMetaNote({
      sampleBased: true,
      sourceRowCount: 10000,
      queryLimit: 10000,
    });
    expect(note).toBe("基于 10,000 行样本聚合（已达查询上限 10,000 行）。");
  });
});

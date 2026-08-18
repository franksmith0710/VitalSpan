import { describe, expect, it } from "vitest";
import {
  mergeSuggestedFieldMapping,
  suggestStandardFieldMapping,
  validateStandardPackDraft,
} from "./standardAnalysisValidation";
import type { AnalysisPack } from "./useStandardAnalysis";

const basePack: AnalysisPack = {
  packKey: "equipment-overview",
  displayName: "设备标准分析",
  datasetId: "equipment_clean",
  boundConfigId: "b376b0e5-01ad-4c26-beb8-714c6553e7be",
  dataSourceId: "00e7438c-33ac-4239-88a5-af28ecdece19",
  fieldMapping: { status: "", region: "", createdAt: "" },
  enabledThemes: ["lifecycle", "distribution"],
  allowedRoles: ["analyst", "admin"],
  snapshotCronPreset: "daily",
  snapshotRetentionPeriods: 12,
};

describe("standardAnalysisValidation", () => {
  it("suggests common equipment columns", () => {
    expect(suggestStandardFieldMapping(["id", "status", "region", "created_at"])).toEqual({
      status: "status",
      region: "region",
      createdAt: "created_at",
    });
  });

  it("fills only empty mapping slots", () => {
    expect(
      mergeSuggestedFieldMapping(
        { status: "custom_status", region: "", createdAt: "" },
        ["custom_status", "region", "created_at"],
      ),
    ).toEqual({
      status: "custom_status",
      region: "region",
      createdAt: "created_at",
    });
  });

  it("rejects mapping that does not exist in dataset columns", () => {
    const message = validateStandardPackDraft(
      {
        ...basePack,
        fieldMapping: { status: "status", region: "region", createdAt: "created_at" },
      },
      ["order_id", "amount"],
    );
    expect(message).toMatch(/不在当前数据集列中/);
  });
});

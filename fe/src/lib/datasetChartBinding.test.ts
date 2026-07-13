import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildDatasetQueryPayload,
  createAndBindDatasetQueryConfig,
  resolveDatasetChartBinding,
} from "./datasetChartBinding";
import { parseQualifiedTable } from "./datasetTableUtils";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

describe("parseQualifiedTable", () => {
  it("splits schema.table", () => {
    expect(parseQualifiedTable("sample_db.sales")).toEqual({
      schema: "sample_db",
      table: "sales",
    });
  });

  it("handles bare table name", () => {
    expect(parseQualifiedTable("orders")).toEqual({ schema: "", table: "orders" });
  });
});

describe("buildDatasetQueryPayload", () => {
  it("builds dataset_query payload", () => {
    const payload = buildDatasetQueryPayload({
      dataSourceId: "ds-1",
      connectorType: "mysql",
      schema: "demo",
      table: "orders",
      columns: ["id", "amount"],
    });
    expect(payload.dataSourceId).toBe("ds-1");
    expect(payload.columns).toEqual(["id", "amount"]);
    expect(payload.conditions.logic).toBe("AND");
  });
});

describe("resolveDatasetChartBinding", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("reads dataSourceId from config payload", async () => {
    mockApiFetch.mockResolvedValue({
      id: "cfg-1",
      configType: "dataset_query",
      payload: { dataSourceId: "ds-mysql" },
    });
    const binding = await resolveDatasetChartBinding("cfg-1");
    expect(binding).toEqual({ configId: "cfg-1", dataSourceId: "ds-mysql" });
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/query/configs/cfg-1");
  });
});

describe("createAndBindDatasetQueryConfig", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000001" });
  });

  it("PUT config then POST bind", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ id: "cfg-new" })
      .mockResolvedValueOnce({ boundConfigId: "cfg-new" });

    const id = await createAndBindDatasetQueryConfig({
      datasetId: "ds-demo",
      dataSourceId: "ds-1",
      connectorType: "mysql",
      tableName: "public.orders",
      columns: ["id"],
    });

    expect(id).toBe("cfg-new");
    expect(mockApiFetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/query/configs",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockApiFetch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/datasets/ds-demo/bind-query-config",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

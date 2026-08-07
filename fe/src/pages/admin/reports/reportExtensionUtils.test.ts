import { describe, expect, it } from "vitest";
import {
  emptyExtensionConfig,
  metricKeyValidationMessage,
  normalizeExtensionResponse,
} from "./reportExtensionUtils";

describe("reportExtensionUtils", () => {
  it("normalizes snake_case extension payloads from API", () => {
    const out = normalizeExtensionResponse({
      catalog_node_id: "node-1",
      default_data_source_id: "ds-1",
      metrics: [
        {
          key: "revenue",
          label: "营收",
          query_mode: "dataset",
          dataset_id: "demo2",
          bound_config_id: "cfg-1",
        },
      ],
      filters: [],
      revision: 2,
    });
    expect(out.catalogNodeId).toBe("node-1");
    expect(out.defaultDataSourceId).toBe("ds-1");
    expect(out.metrics[0]).toMatchObject({
      key: "revenue",
      queryMode: "dataset",
      datasetId: "demo2",
      boundConfigId: "cfg-1",
    });
  });

  it("returns empty config for new templates", () => {
    expect(emptyExtensionConfig("tpl-1")).toEqual({
      catalogNodeId: "tpl-1",
      metrics: [],
      filters: [],
    });
  });

  it("rejects invalid metric keys", () => {
    expect(metricKeyValidationMessage("22")).toMatch(/小写字母/);
    expect(metricKeyValidationMessage("revenue")).toBeNull();
  });
});

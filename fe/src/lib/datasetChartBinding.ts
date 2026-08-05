import { apiFetch } from "@/lib/api";
import { parseQualifiedTable } from "@/lib/datasetTableUtils";

export type DatasetQueryConfigPayload = {
  dataSourceId: string;
  connectorType: string;
  schema: string;
  table: string;
  columns: string[];
  conditions: { logic: "AND"; conditions: [] };
  limit: number;
  offset: number;
};

type QueryConfigRecord = {
  id: string;
  configType: string;
  refType?: string;
  refId?: string;
  payload: DatasetQueryConfigPayload & Record<string, unknown>;
};

export type DatasetChartBinding = {
  configId: string;
  dataSourceId?: string;
  columns?: string[];
  schema?: string;
  table?: string;
};

export function buildDatasetQueryPayload(params: {
  dataSourceId: string;
  connectorType: string;
  schema: string;
  table: string;
  columns: string[];
}): DatasetQueryConfigPayload {
  return {
    dataSourceId: params.dataSourceId,
    connectorType: params.connectorType,
    schema: params.schema,
    table: params.table,
    columns: params.columns,
    conditions: { logic: "AND", conditions: [] },
    limit: 1000,
    offset: 0,
  };
}

export async function fetchDatasetQueryConfig(configId: string): Promise<DatasetChartBinding> {
  const record = await apiFetch<QueryConfigRecord>(`/api/v1/query/configs/${configId}`);
  const payload = record.payload ?? {};
  const dataSourceId =
    typeof payload.dataSourceId === "string" ? payload.dataSourceId : undefined;
  const columns = Array.isArray(payload.columns)
    ? payload.columns.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  const schema = typeof payload.schema === "string" ? payload.schema : undefined;
  const table = typeof payload.table === "string" ? payload.table : undefined;
  return { configId: record.id, dataSourceId, columns, schema, table };
}

export async function resolveDatasetChartBinding(configId: string): Promise<DatasetChartBinding> {
  return fetchDatasetQueryConfig(configId);
}

/** 新建或原地更新 dataset_query；已有 boundConfigId 时复用 ref 以避免孤儿配置。 */
export async function saveAndBindDatasetQueryConfig(params: {
  datasetId: string;
  boundConfigId?: string | null;
  dataSourceId: string;
  connectorType: string;
  tableName: string;
  columns: string[];
}): Promise<string> {
  const { schema, table } = parseQualifiedTable(params.tableName);
  const payload = buildDatasetQueryPayload({
    dataSourceId: params.dataSourceId,
    connectorType: params.connectorType,
    schema,
    table,
    columns: params.columns,
  });

  let refType = "dataset";
  let refId = crypto.randomUUID();

  if (params.boundConfigId) {
    const existing = await apiFetch<QueryConfigRecord>(
      `/api/v1/query/configs/${params.boundConfigId}`,
    );
    refType = existing.refType ?? "dataset";
    refId = existing.refId ?? refId;
  }

  const cfg = await apiFetch<{ id: string }>("/api/v1/query/configs", {
    method: "PUT",
    body: JSON.stringify({
      configType: "dataset_query",
      schemaVersion: "1.0",
      refType,
      refId,
      payload,
    }),
  });

  if (!params.boundConfigId || cfg.id !== params.boundConfigId) {
    await apiFetch(`/api/v1/datasets/${params.datasetId}/bind-query-config`, {
      method: "POST",
      body: JSON.stringify({ configId: cfg.id }),
    });
  }

  return cfg.id;
}

/** @deprecated 使用 saveAndBindDatasetQueryConfig */
export async function createAndBindDatasetQueryConfig(params: {
  datasetId: string;
  dataSourceId: string;
  connectorType: string;
  tableName: string;
  columns: string[];
}): Promise<string> {
  return saveAndBindDatasetQueryConfig(params);
}

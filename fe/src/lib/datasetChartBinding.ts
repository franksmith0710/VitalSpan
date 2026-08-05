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

export async function createAndBindDatasetQueryConfig(params: {
  datasetId: string;
  dataSourceId: string;
  connectorType: string;
  tableName: string;
  columns: string[];
}): Promise<string> {
  const { schema, table } = parseQualifiedTable(params.tableName);
  const cfg = await apiFetch<{ id: string }>("/api/v1/query/configs", {
    method: "PUT",
    body: JSON.stringify({
      configType: "dataset_query",
      schemaVersion: "1.0",
      refType: "dataset",
      refId: crypto.randomUUID(),
      payload: buildDatasetQueryPayload({
        dataSourceId: params.dataSourceId,
        connectorType: params.connectorType,
        schema,
        table,
        columns: params.columns,
      }),
    }),
  });
  await apiFetch(`/api/v1/datasets/${params.datasetId}/bind-query-config`, {
    method: "POST",
    body: JSON.stringify({ configId: cfg.id }),
  });
  return cfg.id;
}

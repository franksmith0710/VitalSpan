import { mapApiError } from "@/lib/apiError";

const METADATA_MESSAGES: Record<string, string> = {
  METADATA_CONNECTION_FAILED: "无法连接数据源，请先在上方测试连通性",
  METADATA_TIMEOUT: "元数据查询超时，请稍后重试",
  METADATA_NOT_SUPPORTED: "该连接器不支持元数据浏览",
  METADATA_INVALID_REQUEST: "请求参数无效",
  RESOURCE_FORBIDDEN: "无权访问该数据源",
};

export function mapMetadataError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && METADATA_MESSAGES[code]) return METADATA_MESSAGES[code];
  return mapApiError(err);
}

export function qualifiedTableName(schema: string, table: string): string {
  return `${schema}.${table}`;
}

export function buildSelectSql(schema: string, table: string): string {
  return `SELECT * FROM ${qualifiedTableName(schema, table)} LIMIT 100`;
}

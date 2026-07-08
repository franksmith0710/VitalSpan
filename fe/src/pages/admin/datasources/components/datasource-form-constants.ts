export type FormState = {
  name: string;
  code: string;
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  description: string;
};

export const emptyForm: FormState = {
  name: "",
  code: "",
  type: "mysql",
  host: "",
  port: "3306",
  database: "",
  username: "",
  password: "",
  description: "",
};

export function hostFieldLabel(type: string): string {
  if (type === "rest_api") return "Base URL";
  if (type === "excel" || type === "csv") return "文件路径 / URL";
  return "主机";
}

export function hidePortField(type: string): boolean {
  return type === "excel" || type === "csv" || type === "rest_api";
}

export const CONNECTOR_FIELD_HINTS: Record<
  string,
  { port: string; databaseLabel: string; usernameLabel: string }
> = {
  mongodb: { port: "27017", databaseLabel: "认证库", usernameLabel: "用户名" },
  elasticsearch: { port: "9200", databaseLabel: "默认索引（可选）", usernameLabel: "用户名" },
  opensearch: { port: "9200", databaseLabel: "默认索引（可选）", usernameLabel: "用户名" },
  dm: { port: "5236", databaseLabel: "库/模式（OWNER）", usernameLabel: "用户名" },
  kingbase: { port: "54321", databaseLabel: "数据库", usernameLabel: "用户名" },
  gbase: { port: "5258", databaseLabel: "数据库", usernameLabel: "用户名" },
  oceanbase: { port: "2881", databaseLabel: "租户/数据库", usernameLabel: "用户名" },
  tidb: { port: "4000", databaseLabel: "数据库", usernameLabel: "用户名" },
  gaussdb: { port: "5432", databaseLabel: "数据库 / Schema", usernameLabel: "用户名" },
  rest_api: { port: "443", databaseLabel: "API 探测路径", usernameLabel: "用户名（Basic，可选）" },
  excel: { port: "1", databaseLabel: "Sheet 名（可选）", usernameLabel: "用户名" },
  csv: { port: "1", databaseLabel: "数据库", usernameLabel: "用户名" },
  db2: { port: "50000", databaseLabel: "数据库", usernameLabel: "用户名" },
  impala: { port: "21050", databaseLabel: "数据库", usernameLabel: "用户名" },
  redshift: { port: "5439", databaseLabel: "数据库", usernameLabel: "用户名" },
};

export function connectorHintId(type: string): string | undefined {
  if (type === "oceanbase") return "oceanbase-hint";
  if (type === "gaussdb") return "gaussdb-hint";
  if (type === "impala") return "impala-hint";
  return undefined;
}

export function showConnectorHint(type: string): boolean {
  return type === "oceanbase" || type === "gaussdb" || type === "impala";
}

export const CONNECTOR_HINT_TEXT: Record<string, string> = {
  oceanbase: "使用 MySQL 兼容协议连接；集群部署请填写 OBProxy 主机与租户名。",
  gaussdb: "GaussDB 兼容 PostgreSQL 协议，默认端口 5432",
  impala: "兼容 Hive 协议；默认 LDAP/无认证由后端处理",
};

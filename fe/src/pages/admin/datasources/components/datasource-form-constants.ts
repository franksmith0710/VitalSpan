import type { DisplayGroup } from "@/lib/connector-taxonomy";

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

/** 向导「选择连接器」步骤的一行说明；避免重复展示 type id */
export const CONNECTOR_PICKER_SUBTITLES: Record<string, string> = {
  mysql: "开源关系型数据库",
  mariadb: "MySQL 兼容开源数据库",
  postgresql: "开源对象关系型数据库",
  oracle: "企业级商用关系型数据库",
  sqlserver: "微软 SQL Server",
  sqlite: "轻量嵌入式数据库",
  dm: "国产达梦关系型数据库",
  kingbase: "国产 KingbaseES 数据库",
  gbase: "国产南大通用 GBase",
  oceanbase: "分布式 HTAP，MySQL 兼容协议",
  tidb: "分布式 NewSQL，MySQL 兼容",
  gaussdb: "华为 GaussDB，PostgreSQL 兼容",
  db2: "IBM 企业级关系型数据库",
  clickhouse: "列式 OLAP 分析数据库",
  starrocks: "极速全场景 MPP 数据库",
  doris: "Apache MPP 分析型数据库",
  redshift: "AWS 云数据仓库",
  hive: "Hadoop 数据仓库，HiveServer2",
  impala: "MPP SQL 查询，Hive 兼容",
  trino: "分布式 SQL，联邦多数据源查询",
  presto: "分布式 SQL 查询引擎",
  mongodb: "文档型 NoSQL 数据库",
  elasticsearch: "分布式搜索与分析引擎",
  opensearch: "开源搜索与分析套件",
  influxdb: "时序数据库",
  tdengine: "国产时序数据库",
  timescaledb: "基于 PostgreSQL 的时序扩展",
  excel: "Excel 工作簿文件",
  csv: "逗号分隔文本文件",
  rest_api: "HTTP REST 接口数据源",
};

export function connectorPickerSubtitle(
  type: string,
  displayGroup: DisplayGroup,
  queryCapable?: boolean,
): string {
  const base = (() => {
    if (CONNECTOR_PICKER_SUBTITLES[type]) return CONNECTOR_PICKER_SUBTITLES[type];
    if (CONNECTOR_HINT_TEXT[type]) return CONNECTOR_HINT_TEXT[type];
    const port = CONNECTOR_FIELD_HINTS[type]?.port;
    const groupLine = {
      oltp: "关系型 OLTP 数据库",
      olap: "分析型 OLAP 引擎",
      warehouse: "湖仓联邦 SQL 查询",
      file: "本地或远程文件数据源",
      api: "HTTP 接口数据源",
      extension: "扩展型数据源",
    }[displayGroup];
    if (port && port !== "1") return `${groupLine} · 默认端口 ${port}`;
    return groupLine;
  })();
  if (queryCapable === false) {
    return `${base} · 仅连接与 Schema（图表查询待支持）`;
  }
  return base;
}

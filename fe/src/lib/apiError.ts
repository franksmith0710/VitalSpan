import { ApiRequestError } from "@/lib/api";

const CODE_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "用户名或密码错误",
  UNAUTHORIZED: "登录已过期，请重新登录",
  DASH_NOT_FOUND: "看板不存在或已被删除",
  DATASOURCE_IN_USE: "数据源正在被引用，无法删除",
  DATASOURCE_NOT_FOUND: "数据源不存在",
  DATASOURCE_CODE_CONFLICT: "数据源标识已存在，请更换为唯一标识",
  DATASOURCE_NAME_CONFLICT: "数据源名称已存在，请更换名称",
  DATASOURCE_TEST_INFLIGHT: "已有测试进行中，请稍候",
  DASH_INVALID_LAYOUT: "看板布局校验失败，请检查组件配置",
  VIEW_LAYOUT_BOUNDS: "布局位置或尺寸超出 12 列画布范围，请调整后重试",
  DASH_FILTER_EMPTY_FILTERS: "请至少配置一个全局筛选器后再保存联动",
  META_DATASET_CONFLICT: "Dataset ID 已存在，请更换标识",
  META_DATASET_NOT_FOUND: "Dataset 不存在或已被删除",
  META_DATASET_EMPTY_TABLES: "请至少添加一张数据表",
  META_DATASET_DUPLICATE_TABLE: "数据表名称重复",
  META_DATASET_INVALID_FIELD: "计算字段填写不正确",
  META_DATASET_INVALID_EXPRESSION: "计算字段表达式无效",
  META_DATASET_CONFIG_TYPE_INVALID: "只能绑定 dataset_query 类型的查询配置",
  META_DATASET_FORBIDDEN: "没有权限操作此 Dataset",
  META_DATASET_ID_MISMATCH: "Dataset ID 与路径不一致",
};

export function isDashboardNotFound(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    if (err.code === "DASH_NOT_FOUND") return true;
    if (/dashboard not found/i.test(err.message)) return true;
  }
  return false;
}

export function mapApiError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
    if (err.message && !err.message.includes("traceId")) return err.message;
  }
  if (err instanceof Error && err.message && !/failed to fetch/i.test(err.message)) {
    return err.message;
  }
  return "操作失败，请稍后重试";
}

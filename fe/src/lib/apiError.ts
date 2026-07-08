import { ApiRequestError } from "@/lib/api";

const CODE_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "用户名或密码错误",
  UNAUTHORIZED: "登录已过期，请重新登录",
  DATASOURCE_IN_USE: "数据源正在被引用，无法删除",
  DATASOURCE_NOT_FOUND: "数据源不存在",
  DATASOURCE_CODE_CONFLICT: "数据源标识已存在，请更换为唯一标识",
  DATASOURCE_NAME_CONFLICT: "数据源名称已存在，请更换名称",
  DATASOURCE_TEST_INFLIGHT: "已有测试进行中，请稍候",
  VALIDATION_ERROR: "请检查表单填写是否正确",
};

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

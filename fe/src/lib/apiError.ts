import { ApiRequestError } from "@/lib/api";

/** API `code` → 用户可见中文（与后端错误码对齐） */
const CODE_MESSAGES: Record<string, string> = {
  // 鉴权 / 会话
  AUTH_INVALID_CREDENTIALS: "用户名或密码错误",
  REQUEST_TIMEOUT: "请求超时，请确认后端服务与数据库已启动",
  AUTH_CONTEXT_UNAVAILABLE: "登录失败，无法获取用户信息",
  AUTH_INVALID_CURRENT_PASSWORD: "当前密码不正确",
  AUTH_PASSWORD_UNCHANGED: "新密码不能与当前密码相同",
  AUTH_PASSWORD_NOT_SET: "该账号未配置密码",
  AUTH_ROOT_ROLE_IMMUTABLE: "根角色不可删除或停用",
  UNAUTHORIZED: "登录已过期，请重新登录",
  NOT_AUTHENTICATED: "未登录，请先登录",
  MISSING_OR_INVALID_TOKEN: "登录凭证无效，请重新登录",

  // 角色 / 用户 / 组织
  ROLE_CODE_CONFLICT: "角色编码已存在",
  ROLE_NOT_FOUND: "角色不存在",
  ROLE_DISABLED: "角色已停用",
  ROLE_IN_USE: "角色仍被用户或授权引用，无法删除",
  ROLE_FORBIDDEN: "无权管理角色",
  USERNAME_CONFLICT: "用户名已存在",
  USER_NOT_FOUND: "用户不存在",
  BINDING_FORBIDDEN: "无权管理用户角色绑定",
  BINDING_NOT_FOUND: "绑定记录不存在",
  ORG_NOT_FOUND: "组织节点不存在",
  ORG_PARENT_NOT_FOUND: "上级组织节点不存在",
  ORG_CYCLE: "组织树移动会形成循环，操作被拒绝",
  ORG_DEPTH_EXCEEDED: "组织树层级超过上限",
  ORG_HAS_CHILDREN: "存在子节点，无法删除该组织",
  ORG_HAS_USERS: "仍有用户归属该组织，无法删除",
  PROFILE_NO_CHANGES: "没有可更新的资料字段",

  // 资源授权
  GRANT_ALREADY_EXISTS: "该角色已绑定此资源，请勿重复授权",
  GRANT_NOT_FOUND: "授权记录不存在",
  RESOURCE_FORBIDDEN: "当前角色无权访问该资源",
  INVALID_RESOURCE_TYPE: "资源类型无效",

  // 看板 / 视图
  DASH_NOT_FOUND: "看板不存在或已被删除",
  DASH_INVALID_LAYOUT: "看板布局校验失败，请检查组件配置",
  VALIDATION_ERROR: "布局校验失败",
  DASH_FILTER_EMPTY_FILTERS: "请至少配置一个全局筛选器后再保存联动",
  DASH_FILTER_FORBIDDEN: "无权修改全局筛选联动",
  DASH_FILTER_NOT_FOUND: "未配置全局筛选联动",
  DASH_FILTER_DASHBOARD_NOT_FOUND: "关联的看板不存在",
  DASH_FILTER_DUPLICATE_ID: "筛选器 ID 重复",
  DASH_FILTER_WIDGET_NOT_FOUND: "筛选联动引用了已删除的组件，请重新配置联动规则",
  DASH_FILTER_UNKNOWN_SOURCE: "筛选联动引用了不存在的筛选器",
  DASH_FILTER_INVALID_DIMENSION_REF: "筛选器维度引用无效",
  DASH_FILTER_DUPLICATE_PARAMETER_KEY: "筛选联动参数键重复",
  DASH_OVERVIEW_FORBIDDEN: "无权访问实体总览",
  DASH_OVERVIEW_NOT_FOUND: "实体总览尚未配置",
  DASH_OVERVIEW_DASHBOARD_NOT_FOUND: "关联看板不存在",
  DASH_OVERVIEW_DUPLICATE_METRIC: "指标键重复",
  DASH_THEME_EMPTY_DIMENSIONS: "请至少选择一个分析维度",
  DASH_THEME_INVALID_GEO: "地理维度需同时配置纬度与经度字段",
  DASH_THEME_FILTER_UNSAFE: "筛选值不安全或格式无效",
  DASH_THEME_DIMENSION_UNKNOWN: "未知的分析维度",
  DASH_THEME_ENTITY_NOT_READY: "实体物理表尚未就绪",
  VIEW_LAYOUT_BOUNDS: "布局位置或尺寸超出画布范围，请调整后重试",
  VIEW_OVERRIDE_NOT_FOUND: "个人视图不存在",
  VIEW_OVERRIDE_CONFLICT: "视图名称已存在",
  VIEW_OVERRIDE_DASHBOARD_NOT_FOUND: "关联看板不存在",
  VIEW_OVERRIDE_OUT_OF_BOUNDS: "组件数量超过角色默认视图上限",

  // 数据源 / 查询
  DATASOURCE_NOT_FOUND: "数据源不存在",
  DATASOURCE_IN_USE: "数据源正在被引用，无法删除",
  DATASOURCE_CODE_CONFLICT: "数据源标识已存在，请更换为唯一标识",
  DATASOURCE_NAME_CONFLICT: "数据源名称已存在，请更换名称",
  DATASOURCE_TEST_INFLIGHT: "已有连接测试进行中，请稍候",
  TEST_IN_PROGRESS: "已有连接测试进行中，请稍候",
  UNKNOWN_CONNECTOR_TYPE: "不支持的连接器类型",
  CREDENTIAL_DECRYPT_FAILED: "数据源凭证无法解密，请重启后端或在「数据连接」中重新保存密码",
  QUERY_NOT_READONLY: "仅允许只读查询，请检查 SQL",
  QUERY_CONNECTION_FAILED: "数据库连接失败",
  QUERY_TIMEOUT: "查询超时，请缩小数据范围",
  QUERY_SYNTAX_ERROR: "SQL 语法错误，请检查配置",
  QUERY_TABLE_NOT_FOUND: "表不存在，请检查 schema 与表名",
  QUERY_EXECUTION_ERROR: "查询执行失败",
  QUERY_NATIVE_WRONG_MODE: "当前数据源不支持原生查询模式",
  QUERY_NATIVE_UNSUPPORTED_CONNECTOR: "不支持的 native 连接器",
  QUERY_NATIVE_INJECTION_SUSPECT: "原生查询参数存在安全风险",
  QUERY_NATIVE_SQL_DISGUISE: "原生模式不允许填写 SQL 字段",
  QUERY_NATIVE_EMPTY_BODY: "原生查询体不能为空",
  QUERY_NATIVE_INVALID_BODY: "原生查询体格式无效",
  QUERY_NATIVE_EXECUTE_UNSUPPORTED: "该连接器暂不支持原生执行",
  QUERY_NATIVE_OFFSET_UNSUPPORTED: "该连接器不支持分页偏移",
  QUERY_NATIVE_RLS_UNSUPPORTED: "原生查询暂不支持行级权限",
  QUERY_FILTER_UNSAFE: "筛选值不安全，请修改后重试",
  QUERY_INVALID_REQUEST: "查询请求参数无效",
  QUERY_PATH_AMBIGUOUS: "查询路径字段冲突",
  QUERY_DATASET_NOT_FOUND: "Dataset 不存在",
  QUERY_DATASET_FORBIDDEN: "无权访问该 Dataset",
  QUERY_DATASET_NOT_READONLY: "Dataset 查询仅允许 SELECT",
  QUERY_DATASET_PLAN_INVALID_PARAMS: "Dataset 查询参数无效",
  BINDING_CHART_CONFLICT: "该图表已绑定其他查询",
  RLS_CONFIG_INVALID: "行级权限配置无效",
  PERMISSION_DENIED: "无权执行此操作",

  // Dataset / 元数据
  META_DATASET_CONFLICT: "Dataset ID 已存在，请更换标识",
  META_DATASET_NOT_FOUND: "Dataset 不存在或已被删除",
  META_DATASET_EMPTY_TABLES: "请至少添加一张数据表",
  META_DATASET_DUPLICATE_TABLE: "数据表名称重复",
  META_DATASET_INVALID_FIELD: "计算字段填写不正确",
  META_DATASET_INVALID_EXPRESSION: "计算字段表达式无效",
  META_DATASET_CONFIG_TYPE_INVALID: "只能绑定 dataset_query 类型的查询配置",
  META_DATASET_FORBIDDEN: "没有权限操作此 Dataset",
  META_DATASET_ID_MISMATCH: "Dataset ID 与路径不一致",
  META_TERM_NOT_FOUND: "术语不存在",
  META_DIM_NOT_FOUND: "维度不存在",
  META_DIM_CODE_CONFLICT: "维度编码已存在",
  META_DIM_VALUE_NOT_FOUND: "维度枚举值不存在",
  META_THEME_PARENT_NOT_FOUND: "上级主题节点不存在",
  META_PHYSICAL_NOT_FOUND: "物理表不存在",
  META_PHYSICAL_CONFLICT: "物理表已注册",
  META_PHYSICAL_FORBIDDEN: "无权注册物理表",
  META_PHYSICAL_INVALID_FQN: "表 FQN 格式无效",
  META_PHYSICAL_INVALID_COLUMN: "列名无效",

  // RLS 维度 / 分组
  DIMENSION_NOT_FOUND: "维度类型不存在",
  DIMENSION_FORBIDDEN: "无权管理维度类型",
  DIMENSION_IN_USE: "维度类型仍被引用，无法删除",
  DIMENSION_CODE_CONFLICT: "维度类型编码已存在",
  DIMENSION_VALUE_INVALID: "维度成员值无效",
  GROUP_NOT_FOUND: "维度分组不存在",
  GROUP_CODE_CONFLICT: "该维度类型下分组编码已存在",
  GROUP_PARENT_NOT_FOUND: "上级分组不存在",
  GROUP_PARENT_MISMATCH: "上级分组维度类型不匹配",
  GROUP_CYCLE: "分组层级不能形成循环",
  GROUP_IN_USE: "分组仍被引用，无法删除",
  GROUP_VALUE_CONFLICT: "分组成员值重复",
  GROUP_VALUE_NOT_FOUND: "分组成员值不存在",

  // 治理 / 设计器 / 报表
  CATALOG_INVALID_CATEGORY: "目录分类无效",
  CATALOG_ENTRY_NOT_FOUND: "目录条目不存在",
  BUS_ENTRY_NOT_PUBLISHABLE: "草稿条目不可发布",
  GOV_WORKFLOW_TEMPLATE_NOT_FOUND: "工作流模板不存在",
  GOV_WORKFLOW_BUILTIN_READONLY: "内置工作流模板不可修改",
  GOV_WORKFLOW_TEMPLATE_IN_USE: "模板仍被流程实例引用",
  GOV_WORKFLOW_INVALID_TEMPLATE: "工作流模板配置无效",
  GOV_WORKFLOW_ALREADY_TERMINAL: "流程已发布，无法重复操作",
  GOV_WORKFLOW_CONFLICT: "流程状态冲突",
  GOV_WORKFLOW_INVALID_TRANSITION: "当前状态不允许此操作",
  GOV_WORKFLOW_FORBIDDEN_ROLE: "当前角色无权执行此操作",
  DESIGN_WORKFLOW_INSTANCE_NOT_FOUND: "设计器流程实例不存在",
  DESIGN_WORKFLOW_INVALID_ITEM: "设计器配置项无效",
  DESIGN_WORKFLOW_LINK_NOT_FOUND: "设计器流程关联不存在",
  DESIGN_SUBMIT_FORBIDDEN: "无权提交或撤回设计器配置",
  DESIGN_SUBMIT_INCOMPLETE: "设计器配置不完整，无法提交",
  DESIGN_INVALID_VALUE_TYPE: "字段值类型无效",
  DESIGN_VALUE_TYPE_MISMATCH: "字段值与类型不匹配",
  DESIGN_RULE_CYCLE: "规则存在循环依赖",
  RPT_TEMPLATE_NOT_FOUND: "报表模板不存在",
  RPT_TEMPLATE_INVALID_BLOCK: "模板块配置无效",
  RPT_TEMPLATE_EMPTY_BLOCKS: "模板块不能为空",
  RPT_TEMPLATE_IN_USE: "模板仍被目录引用",
  RPT_SCHEDULE_FORBIDDEN: "无权操作报表调度",
  RPT_PREFAB_FORBIDDEN: "无权操作预制报表绑定",
  RPT_EXT_FORBIDDEN: "无权修改报表扩展",
  AUDIT_FORBIDDEN: "无权查询审计日志",
  CONFIG_NOT_FOUND: "查询配置不存在",
};

/** 后端英文 `message` 精确匹配 → 中文 */
const EXACT_MESSAGE_MAP: Record<string, string> = {
  "Root role cannot be deleted": "根角色不可删除",
  "Root role cannot be disabled": "根角色不可停用",
  "Role code already exists": "角色编码已存在",
  "Role not found": "角色不存在",
  "Role is disabled": "角色已停用",
  "Role is referenced by bindings or grants": "角色仍被用户绑定或资源授权引用，无法删除",
  "Username already exists": "用户名已存在",
  "User not found": "用户不存在",
  "Binding changes require admin role": "仅管理员可修改绑定关系",
  "Binding not found": "绑定记录不存在",
  "User-role binding not found": "用户角色绑定不存在",
  "Org node not found": "组织节点不存在",
  "Resource grant already exists": "该资源授权已存在",
  "Resource grant not found": "授权记录不存在",
  "Resource not visible for current roles": "当前角色不可见该资源",
  "Missing or invalid bearer token": "登录凭证无效，请重新登录",
  "Not authenticated": "未登录，请先登录",
  "Dashboard not found": "看板不存在或已被删除",
  "Data source not found": "数据源不存在",
  "Data source is referenced by grants": "数据源仍被授权引用，无法删除",
  "Data source code already exists": "数据源标识已存在",
  "Data source name already exists": "数据源名称已存在",
  "Connection test already in progress": "已有连接测试进行中，请稍候",
  "Connection successful": "数据库连接正常",
  "Dataset not found": "Dataset 不存在",
  "Dataset already exists": "Dataset 已存在",
  "Group not found": "维度分组不存在",
  "Dimension type not found": "维度类型不存在",
  "Term not found": "术语不存在",
  "Dimension not found": "维度不存在",
  "Parent node not found": "上级节点不存在",
  "View override not found": "个人视图不存在",
  "Access denied": "无权访问",
  "Not found": "资源不存在",
};

const MESSAGE_PREFIX_MAP: Array<[RegExp, string]> = [
  [/^templateKey not found:/i, "报表模板不存在"],
  [/^tableFqn not found:/i, "物理表不存在"],
  [/^Dimension not found:/i, "维度不存在"],
  [/^unknown dimensionId=/i, "未知的分析维度"],
  [/^Org tree depth cannot exceed/i, "组织树层级超过上限"],
  [/^Invalid dashboardId/i, "看板 ID 无效"],
  [/^Unknown connector type:/i, "不支持的连接器类型"],
];

const GENERIC_FAILURE = "操作失败，请稍后重试";

function containsCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function isLikelyEnglishUserMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || containsCjk(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

export function localizeApiMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return GENERIC_FAILURE;
  if (containsCjk(trimmed)) return trimmed;
  if (EXACT_MESSAGE_MAP[trimmed]) return EXACT_MESSAGE_MAP[trimmed];
  for (const [pattern, zh] of MESSAGE_PREFIX_MAP) {
    if (pattern.test(trimmed)) return zh;
  }
  if (isLikelyEnglishUserMessage(trimmed)) return GENERIC_FAILURE;
  return trimmed;
}

export function isDashboardNotFound(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    if (err.code === "DASH_NOT_FOUND") return true;
    if (/dashboard not found/i.test(err.message)) return true;
  }
  return false;
}

type CodedError = Error & {
  code?: string;
  fields?: Array<{ field: string; message: string }>;
};

function asCodedError(err: unknown): CodedError | null {
  if (!(err instanceof Error)) return null;
  return err as CodedError;
}

export function mapApiError(err: unknown): string {
  const coded = asCodedError(err);
  if (coded) {
    if (coded.code && CODE_MESSAGES[coded.code]) {
      const mapped = CODE_MESSAGES[coded.code];
      const fieldHint = coded.fields?.[0]?.message?.trim();
      if (fieldHint && !mapped.includes(fieldHint)) {
        return `${mapped}（${localizeApiMessage(fieldHint)}）`;
      }
      return mapped;
    }
    if (coded.message && !coded.message.includes("traceId")) {
      return localizeApiMessage(coded.message);
    }
    if (/failed to fetch|networkerror|load failed/i.test(coded.message)) {
      return "无法连接服务器，请确认后端已启动（uvicorn :8000）且数据库可访问";
    }
  }
  return GENERIC_FAILURE;
}

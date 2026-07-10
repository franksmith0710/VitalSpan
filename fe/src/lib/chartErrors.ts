const MAP: Record<string, string> = {
  CHART_FIELD_REQUIREMENT: "字段配置不符合图表要求",
  CHART_INVALID_STYLE_VARIANT: "所选样式子类型无效",
  CHART_MISSING_SERIES: "请至少配置一个度量字段",
  CHART_INVALID_TYPE: "图表类型无效",
};

const MESSAGE_PATTERNS: Array<{ test: RegExp; text: string }> = [
  { test: /Input should be 'sql'/i, text: "当前为 Dataset 模式，请切换到「高级 SQL」或清空 Dataset 绑定" },
  { test: /Input should be 'dataset'/i, text: "当前为 SQL 模式，请切换到 Dataset 或填写 SQL" },
  { test: /field required/i, text: "请补全必填字段" },
];

export function mapChartConfigError(code: string, message?: string): string {
  if (code && MAP[code]) return MAP[code];
  if (message) {
    for (const { test, text } of MESSAGE_PATTERNS) {
      if (test.test(message)) return text;
    }
    if (/^Input should be /i.test(message)) {
      return "数据绑定方式与当前配置不一致，请检查 Dataset / SQL 切换";
    }
  }
  return message ?? "配置校验失败，请检查字段与样式";
}

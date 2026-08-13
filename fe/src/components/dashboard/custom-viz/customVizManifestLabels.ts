/** manifest 中文标签在错误编码上传后会变成「??」，此处兜底为平台默认文案。 */
export function sanitizeManifestLabel(label: string | undefined, fallback: string): string {
  const trimmed = label?.trim();
  if (!trimmed) return fallback;
  if (/^[\uFFFD?]+$/.test(trimmed)) return fallback;
  return trimmed;
}

export const CUSTOM_VIZ_DEFAULT_DIMENSION_LABEL = "维度";
export const CUSTOM_VIZ_DEFAULT_METRIC_LABEL = "指标";

export const CUSTOM_VIZ_STYLE_PROPERTY_TITLES: Record<string, string> = {
  accentColor: "强调色",
  barHeight: "条高度",
  fontSize: "字号",
  opacity: "不透明度",
};

export function resolveCustomVizStylePropertyLabel(key: string, title?: string): string {
  return sanitizeManifestLabel(title, CUSTOM_VIZ_STYLE_PROPERTY_TITLES[key] ?? key);
}

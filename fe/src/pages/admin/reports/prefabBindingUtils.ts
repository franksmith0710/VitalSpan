/** 新建预制绑定时生成唯一绑定键草稿。 */
export function suggestPrefabBindingKey(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `prefab-${suffix}`;
}

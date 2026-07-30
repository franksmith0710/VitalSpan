/** Query key for prefab binding deep-link from Report Center Hub. */
export const PREFAB_BINDING_QUERY = "binding";

export function prefabReportsRunPath(bindingKey: string): string {
  const params = new URLSearchParams({ [PREFAB_BINDING_QUERY]: bindingKey });
  return `/admin/reports?${params.toString()}`;
}

/** H1：治理侧栏开关。仅当 `VITE_GOV_NAV=1` 时为 true。 */
export function isGovNavEnabledFromEnv(): boolean {
  return import.meta.env.VITE_GOV_NAV === "1";
}

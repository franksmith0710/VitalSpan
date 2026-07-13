/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** H1：设为 `"1"` 时侧栏显示「治理」分组；默认隐藏 */
  readonly VITE_GOV_NAV?: string;
  /** Dashboard 像素画布默认开启；仅显式 `"false"` 时回退 */
  readonly VITE_DASHBOARD_PIXEL_CANVAS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

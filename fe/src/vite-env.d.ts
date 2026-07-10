/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** H1：设为 `"1"` 时侧栏显示「治理」分组；默认隐藏 */
  readonly VITE_GOV_NAV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

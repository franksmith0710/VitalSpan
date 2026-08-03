export type SyncJobLastRun = {
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_synced: number | null;
  error_message: string | null;
};

export type SyncJobSummary = {
  id: string;
  name: string;
  source_type: string;
  target_table: string;
  enabled: boolean;
  schedule_cron: string | null;
  last_run?: SyncJobLastRun | null;
};

export type SyncJobListResponse = {
  items: SyncJobSummary[];
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  sqlserver: "SQL Server",
  oracle: "Oracle",
};

export function sourceTypeLabel(type: string) {
  return SOURCE_TYPE_LABELS[type.toLowerCase()] ?? type;
}

export function lastRunStatusLabel(status: string) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  return status;
}

export function lastRunBadgeColor(status: string): "success" | "error" | "warning" | "light" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "warning";
  return "light";
}

export const CRON_PRESETS = [
  { label: "每天 02:00", value: "0 2 * * *" },
  { label: "每天 06:00", value: "0 6 * * *" },
  { label: "每小时", value: "0 * * * *" },
  { label: "每周一 02:00", value: "0 2 * * 1" },
] as const;

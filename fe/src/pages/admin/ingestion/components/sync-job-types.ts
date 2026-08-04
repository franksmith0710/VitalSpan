export type SyncJobLastRun = {
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_synced: number | null;
  error_message: string | null;
};

export type SyncJobConsumeStatus = {
  label: "ready" | "pending_dataset" | "pending_prepare";
  next_action: "prepare" | "ensure_dataset" | "open_dashboard";
};

export type SyncJobSummary = {
  id: string;
  name: string;
  source_type: string;
  source_database?: string | null;
  source_label?: string | null;
  source_data_source_id?: string | null;
  sync_mode?: string;
  target_table: string;
  enabled: boolean;
  schedule_cron: string | null;
  last_run?: SyncJobLastRun | null;
  consume_status?: SyncJobConsumeStatus | null;
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

export function syncModeLabel(mode: string | undefined) {
  if (mode === "incremental") return "增量";
  return "全量";
}

export function sourceSummaryLabel(job: Pick<SyncJobSummary, "source_type" | "source_database" | "source_label">) {
  if (job.source_label) return job.source_label;
  const type = sourceTypeLabel(job.source_type);
  if (job.source_database) return `${type} · ${job.source_database}`;
  return type;
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

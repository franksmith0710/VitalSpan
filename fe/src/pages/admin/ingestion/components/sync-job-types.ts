export type SyncJobSummary = {
  id: string;
  name: string;
  source_type: string;
  target_table: string;
  enabled: boolean;
  schedule_cron: string | null;
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

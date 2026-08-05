import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  resolveSyncSourceSchema,
  supportsSyncSourceTablePicker,
} from "./syncSourceTablePicker";

type SyncSourceTableSelectProps = {
  id?: string;
  label: string;
  placeholder?: string;
  dataSourceId: string;
  sourceType?: string;
  database?: string;
  value: string;
  onChange: (value: string) => void;
};

function ManualSourceTableInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-11"
        placeholder={placeholder}
      />
      {hint ? <p className="text-theme-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function SyncSourceTableSelect({
  id = "table",
  label,
  placeholder,
  dataSourceId,
  sourceType,
  database,
  value,
  onChange,
}: SyncSourceTableSelectProps) {
  const pickerEnabled = supportsSyncSourceTablePicker(sourceType) && Boolean(dataSourceId);

  const schemasQuery = useQuery({
    queryKey: queryKeys.datasources.schemas(dataSourceId),
    queryFn: () =>
      apiFetch<{ items: Array<{ name: string }> }>(
        `/api/v1/datasources/${dataSourceId}/schemas`,
      ),
    enabled: pickerEnabled,
    staleTime: 60_000,
  });

  const schema = useMemo(() => {
    if (!pickerEnabled) return "";
    const names = (schemasQuery.data?.items ?? []).map((item) => item.name);
    return resolveSyncSourceSchema(names, database);
  }, [database, pickerEnabled, schemasQuery.data?.items]);

  const tablesQuery = useQuery({
    queryKey: queryKeys.datasources.tables(dataSourceId, schema),
    queryFn: () =>
      apiFetch<{ items: Array<{ name: string; type?: string }> }>(
        `/api/v1/datasources/${dataSourceId}/tables?schema=${encodeURIComponent(schema)}`,
      ),
    enabled: pickerEnabled && Boolean(schema),
    staleTime: 60_000,
  });

  const tableNames = useMemo(() => {
    const names = (tablesQuery.data?.items ?? [])
      .filter((item) => !item.type || item.type === "table" || item.type === "view")
      .map((item) => item.name);
    const trimmed = value.trim();
    if (trimmed && !names.includes(trimmed)) return [trimmed, ...names];
    return names;
  }, [tablesQuery.data?.items, value]);

  if (!pickerEnabled) {
    return (
      <ManualSourceTableInput
        id={id}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (!dataSourceId) {
    return (
      <ManualSourceTableInput
        id={id}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        hint="请先选择业务源连接。"
      />
    );
  }

  const metadataLoading =
    schemasQuery.isLoading || (Boolean(schema) && tablesQuery.isLoading && tableNames.length === 0);
  const metadataError = schemasQuery.isError || tablesQuery.isError;

  if (metadataLoading) {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Skeleton className="h-11 w-full rounded-lg" />
        <p className="text-theme-xs text-gray-400">加载表列表…</p>
      </div>
    );
  }

  if (metadataError || tableNames.length === 0) {
    return (
      <ManualSourceTableInput
        id={id}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        hint={
          metadataError
            ? `无法加载表列表（${mapApiError(schemasQuery.error ?? tablesQuery.error)}），请手动输入。`
            : schema
              ? `Schema ${schema} 下暂无可用表，请手动输入表名。`
              : "暂无 Schema，请手动输入表名。"
        }
      />
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11" aria-label={label}>
          <SelectValue placeholder={placeholder ?? "选择源表"} />
        </SelectTrigger>
        <SelectContent>
          {tableNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {schema ? (
        <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
          库/Schema：<span>{schema}</span>
        </p>
      ) : null}
    </div>
  );
}

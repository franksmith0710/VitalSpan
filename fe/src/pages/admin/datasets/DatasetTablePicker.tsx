import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table2 } from "lucide-react";
import { toast } from "sonner";
import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import {
  qualifiedTableName,
  type TableSelection,
} from "@/components/datasources/schemaBrowserUtils";
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
import {
  filterSyncJobBindDatasources,
  resolveAnalyticsDatasourceId,
} from "@/lib/datasourceRoles";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { DatasetFieldWorkbench } from "./components/DatasetFieldWorkbench";
import { setPrimaryTable } from "./datasetTableSelection";
import { useDatasetTableColumns } from "./hooks/useDatasetTableColumns";
import type { DatasetBindDraft, DatasetOrigin, DatasetTable } from "./types";

type DsItem = {
  id: string;
  name: string;
  code?: string;
  database?: string;
  type?: string;
  port?: number;
};

function parseFocusTable(prefillTable?: string): { schema: string; table: string } | undefined {
  if (!prefillTable?.trim()) return undefined;
  const raw = prefillTable.trim();
  if (raw.includes(".")) {
    const [schema, table] = raw.split(".", 2);
    if (schema && table) return { schema, table };
  }
  return { schema: "public", table: raw };
}

export function DatasetTablePicker({
  tables,
  onChange,
  preferredDataSourceId,
  prefillTable,
  savedDataSourceId,
  onDataSourceIdChange,
  origin = "manual",
  bindDraft,
  onBindDraftChange,
  boundConfigId,
  syncJobId,
  onRefreshBinding,
  onTableChange,
}: {
  tables: DatasetTable[];
  onChange: (next: DatasetTable[]) => void;
  preferredDataSourceId?: string;
  prefillTable?: string;
  savedDataSourceId?: string;
  onDataSourceIdChange?: (dataSourceId: string) => void;
  origin?: DatasetOrigin;
  bindDraft?: DatasetBindDraft;
  onBindDraftChange?: (next: DatasetBindDraft) => void;
  boundConfigId?: string | null;
  syncJobId?: string | null;
  onRefreshBinding?: () => void;
  /** 换表后通知 FormPage 重置 bind seed */
  onTableChange?: () => void;
}) {
  const isSyncOrigin = origin === "sync_job";
  const readOnlyTables = isSyncOrigin && tables.length > 0;
  const [dataSourceId, setDataSourceId] = useState("");
  const focusTable = useMemo(() => parseFocusTable(prefillTable), [prefillTable]);

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const items = dsQuery.data?.items ?? [];
  const selectableItems = useMemo(
    () => (origin === "sync_job" ? filterSyncJobBindDatasources(items) : items),
    [items, origin],
  );
  const selectedDs = selectableItems.find((d) => d.id === dataSourceId);

  useEffect(() => {
    if (selectableItems.length === 0) return;
    const saved = savedDataSourceId || preferredDataSourceId;
    setDataSourceId((current) => {
      if (current && selectableItems.some((d) => d.id === current)) return current;
      return resolveAnalyticsDatasourceId(selectableItems, saved);
    });
  }, [selectableItems, preferredDataSourceId, savedDataSourceId]);

  const primaryTableName = tables[0]?.name ?? "";
  const effectiveDataSourceId = dataSourceId || savedDataSourceId || "";
  const { columnNames, columnsLoading } = useDatasetTableColumns(
    effectiveDataSourceId,
    primaryTableName,
  );

  const applyTablePick = useCallback(
    (sel: TableSelection) => {
      const name = qualifiedTableName(sel.schema, sel.table);
      if (name === primaryTableName) return;
      onChange(setPrimaryTable(name));
      if (dataSourceId) {
        onDataSourceIdChange?.(dataSourceId);
      }
      onTableChange?.();
    },
    [dataSourceId, onChange, onDataSourceIdChange, onTableChange, primaryTableName],
  );

  const handlePickTable = useCallback(
    (sel: TableSelection) => {
      if (readOnlyTables) return;
      const name = qualifiedTableName(sel.schema, sel.table);
      if (name === primaryTableName) return;

      const hasBindDraft = (bindDraft?.selectedColumns.length ?? 0) > 0;
      if (hasBindDraft && primaryTableName) {
        const ok = window.confirm("切换表将重置字段勾选，是否继续？");
        if (!ok) return;
      }
      applyTablePick(sel);
    },
    [applyTablePick, bindDraft?.selectedColumns.length, primaryTableName, readOnlyTables],
  );

  const handleDataSourceChange = (nextId: string) => {
    if (readOnlyTables || isSyncOrigin) return;
    if (primaryTableName && nextId !== effectiveDataSourceId) {
      toast.warning("已选数据表绑定当前数据源，请先切换数据表再更换数据源");
      return;
    }
    setDataSourceId(nextId);
    onDataSourceIdChange?.(nextId);
  };

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3",
          "dark:border-gray-800 dark:bg-white/[0.02]",
        )}
      >
        <div className="grid min-w-[200px] flex-1 gap-1.5 sm:max-w-xs">
          <Label htmlFor="dataset-datasource" className="text-theme-xs text-gray-600 dark:text-gray-400">
            {isSyncOrigin ? "同步产出库（托管分析库）" : "数据源"}
          </Label>
          {dsQuery.isLoading ? (
            <Skeleton className="h-11 w-full rounded-lg" />
          ) : selectableItems.length === 0 ? (
            <p className="text-theme-xs text-gray-500">
              {isSyncOrigin
                ? "未登记托管分析库，请先完成同步或配置 ANALYTICS_DATABASE_URL。"
                : "暂无可用数据源，请先在「数据源」中创建。"}
            </p>
          ) : !dataSourceId ? (
            <Skeleton className="h-11 w-full rounded-lg" />
          ) : readOnlyTables || isSyncOrigin ? (
            <p
              id="dataset-datasource"
              className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-theme-sm dark:border-gray-800 dark:bg-white/[0.02]"
            >
              {selectedDs?.name ?? "托管分析库"}
            </p>
          ) : (
            <Select value={dataSourceId} onValueChange={handleDataSourceChange}>
              <SelectTrigger id="dataset-datasource" className="h-11" aria-label="选择数据源">
                <SelectValue placeholder="选择数据源" />
              </SelectTrigger>
              <SelectContent>
                {selectableItems.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-1.5">
          <span className="text-theme-xs text-gray-600 dark:text-gray-400">当前数据表</span>
          {primaryTableName ? (
            <p className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <Table2 className="size-4 shrink-0 text-gray-400" aria-hidden />
              <span className="truncate font-mono text-theme-sm text-gray-800 dark:text-gray-200">
                {primaryTableName}
              </span>
            </p>
          ) : (
            <p className="flex h-11 items-center rounded-lg border border-dashed border-gray-200 px-3 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              请在下方 Schema 树选择数据表
            </p>
          )}
        </div>
      </div>

      {isSyncOrigin ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          同步产物固定写入托管分析库；此处仅浏览同步目标表结构，不能改选业务源连接。
        </p>
      ) : null}

      <div
        className={cn(
          "h-[min(360px,38vh)] min-h-[260px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white",
          "dark:border-gray-800 dark:bg-white/[0.02]",
        )}
      >
        {dataSourceId ? (
          <SchemaBrowser
            key={dataSourceId}
            dataSourceId={dataSourceId}
            mode="datasetPick"
            currentTableName={primaryTableName}
            onPickTable={readOnlyTables ? undefined : handlePickTable}
            embedded
            defaultDatabase={selectedDs?.database}
            focusTable={focusTable}
            className="h-full min-h-0"
          />
        ) : (
          <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-center">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">请先选择数据源。</p>
          </div>
        )}
      </div>

      {primaryTableName && bindDraft && onBindDraftChange ? (
        <DatasetFieldWorkbench
          dataSourceId={effectiveDataSourceId}
          connectorType={selectedDs?.type || "postgresql"}
          tableName={primaryTableName}
          columnNames={columnNames}
          columnsLoading={columnsLoading}
          bindDraft={bindDraft}
          onBindDraftChange={onBindDraftChange}
          boundConfigId={boundConfigId}
          origin={origin}
          syncJobId={syncJobId}
          onRefreshBinding={onRefreshBinding}
        />
      ) : null}
    </div>
  );
}

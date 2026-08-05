import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Table2 } from "lucide-react";
import { toast } from "sonner";
import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import {
  qualifiedTableName,
  type TableSelection,
} from "@/components/datasources/schemaBrowserUtils";
import { Button } from "@/components/ui/button";
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

function parseTableFocus(tableName: string): { schema: string; table: string } | undefined {
  if (!tableName.trim()) return undefined;
  if (tableName.includes(".")) {
    const [schema, table] = tableName.split(".", 2);
    if (schema && table) return { schema, table };
  }
  return { schema: "public", table: tableName };
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
  onTableChange?: () => void;
}) {
  const isSyncOrigin = origin === "sync_job";
  const readOnlyTables = isSyncOrigin && tables.length > 0;
  const [dataSourceId, setDataSourceId] = useState("");
  const primaryTableName = tables[0]?.name ?? "";
  const [schemaExpanded, setSchemaExpanded] = useState(() => !primaryTableName);
  const focusTable = useMemo(
    () => parseTableFocus(primaryTableName) ?? parseFocusTable(prefillTable),
    [prefillTable, primaryTableName],
  );

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

  useEffect(() => {
    if (!dataSourceId || !onDataSourceIdChange || savedDataSourceId) return;
    if (primaryTableName) {
      onDataSourceIdChange(dataSourceId);
    }
  }, [dataSourceId, onDataSourceIdChange, primaryTableName, savedDataSourceId]);

  useEffect(() => {
    setSchemaExpanded(!primaryTableName);
  }, [primaryTableName]);

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
      setSchemaExpanded(false);
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
      const ok = window.confirm("切换数据源将清空当前数据表，是否继续？");
      if (!ok) return;
      onChange([]);
      onTableChange?.();
      setSchemaExpanded(true);
    }
    setDataSourceId(nextId);
    onDataSourceIdChange?.(nextId);
  };

  const showSchemaPicker = !primaryTableName || schemaExpanded;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3",
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
            <div className="flex h-11 items-center gap-2">
              <p className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <Table2 className="size-4 shrink-0 text-gray-400" aria-hidden />
                <span className="truncate font-mono text-theme-sm text-gray-800 dark:text-gray-200">
                  {primaryTableName}
                </span>
              </p>
              {!readOnlyTables ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-expanded={schemaExpanded}
                  onClick={() => setSchemaExpanded((open) => !open)}
                >
                  {schemaExpanded ? (
                    <>
                      <ChevronUp className="size-3.5" aria-hidden />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3.5" aria-hidden />
                      更换
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="flex h-11 items-center rounded-lg border border-dashed border-gray-200 px-3 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              请在下方 Schema 树单击表名
            </p>
          )}
        </div>
      </div>

      {isSyncOrigin ? (
        <p className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
          同步产物固定写入托管分析库；此处仅浏览同步目标表结构，不能改选业务源连接。
        </p>
      ) : null}

      {showSchemaPicker ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white",
            "dark:border-gray-800 dark:bg-white/[0.02]",
            primaryTableName
              ? "h-[min(240px,28vh)] min-h-[200px]"
              : "h-[min(320px,36vh)] min-h-[240px]",
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
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">请先选择数据源。</p>
            </div>
          )}
        </div>
      ) : null}

      {primaryTableName && bindDraft && onBindDraftChange ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        </div>
      ) : null}
    </div>
  );
}

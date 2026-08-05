import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import {
  qualifiedTableName,
  type TableSelection,
} from "@/components/datasources/schemaBrowserUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

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
}) {
  const isSyncOrigin = origin === "sync_job";
  const readOnlyTables = isSyncOrigin && tables.length > 0;
  const [dataSourceId, setDataSourceId] = useState("");
  const [tableSourceId, setTableSourceId] = useState<string | null>(null);
  const [selection, setSelection] = useState<TableSelection | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("");
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

  const selectedNames = useMemo(() => new Set(tables.map((t) => t.name)), [tables]);
  const lockedSourceId = tableSourceId ?? (tables.length > 0 ? dataSourceId : null);

  const addTable = useCallback(
    (sel: TableSelection) => {
      const name = qualifiedTableName(sel.schema, sel.table);
      if (selectedNames.has(name) || selectedNames.has(sel.table)) return;
      if (!tableSourceId && dataSourceId) {
        setTableSourceId(dataSourceId);
        onDataSourceIdChange?.(dataSourceId);
      }
      onChange([...tables, { name }]);
    },
    [dataSourceId, onChange, onDataSourceIdChange, selectedNames, tableSourceId, tables],
  );

  const removeTable = (name: string) => {
    const next = tables.filter((t) => t.name !== name);
    onChange(next);
    if (next.length === 0) {
      setTableSourceId(null);
    }
  };

  const handleDataSourceChange = (nextId: string) => {
    if (readOnlyTables) return;
    if (lockedSourceId && nextId !== lockedSourceId && tables.length > 0) {
      toast.warning("已选表绑定当前数据源，请先清空已选表再切换数据源");
      return;
    }
    setDataSourceId(nextId);
    onDataSourceIdChange?.(nextId);
  };

  const filteredTables = useMemo(() => {
    const q = selectedFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [selectedFilter, tables]);

  const primaryTableName = tables[0]?.name ?? "";
  const effectiveDataSourceId = tableSourceId ?? (dataSourceId || savedDataSourceId || "");
  const { columnNames, columnsLoading } = useDatasetTableColumns(
    effectiveDataSourceId,
    primaryTableName,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || isEditableTarget(event.target)) return;
      if (!selection) return;
      event.preventDefault();
      addTable(selection);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addTable, selection]);

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "grid h-[min(400px,42vh)] min-h-[280px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white",
          "dark:border-gray-800 dark:bg-white/[0.02]",
          "grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]",
        )}
      >
        <aside className="flex min-h-0 flex-col border-b border-gray-200 lg:border-r lg:border-b-0 dark:border-gray-800">
          <div className="shrink-0 space-y-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <div className="grid gap-1.5">
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
            {isSyncOrigin ? (
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                同步产物固定写入托管分析库；此处仅浏览同步目标表结构，不能改选业务源连接。
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Table2 className="size-4 shrink-0 text-gray-400" aria-hidden />
                <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">已选表</span>
                <Badge variant="light" color={tables.length > 0 ? "primary" : "light"} size="sm">
                  {tables.length}
                </Badge>
              </div>
              {tables.length > 0 && !readOnlyTables ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-theme-xs text-gray-500"
                  onClick={() => {
                    onChange([]);
                    setTableSourceId(null);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  清空
                </Button>
              ) : null}
            </div>
            {tables.length > 6 ? (
              <SearchField
                value={selectedFilter}
                onChange={setSelectedFilter}
                placeholder="筛选已选表…"
                aria-label="筛选已选表"
                inputClassName="h-9"
              />
            ) : null}
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {tables.length === 0 ? (
              <p className="px-2 py-8 text-center text-theme-xs leading-relaxed text-gray-400 dark:text-gray-500">
                {isSyncOrigin
                  ? "同步产物表由同步任务自动登记，保存后在此查看。"
                  : "右侧浏览 Schema，双击表名或点字段面板的「加入 Dataset」"}
              </p>
            ) : filteredTables.length === 0 ? (
              <p className="px-2 py-6 text-center text-theme-xs text-gray-400">无匹配表</p>
            ) : (
              <ul className="grid gap-0.5">
                {filteredTables.map((t) => (
                  <li key={t.name}>
                    <div className="group flex items-center gap-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                      <span className="min-w-0 flex-1 truncate px-2 py-1.5 font-mono text-theme-xs text-gray-700 dark:text-gray-300">
                        {t.name}
                      </span>
                      {!readOnlyTables ? (
                        <button
                          type="button"
                          className="mr-1 shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/20 dark:hover:bg-white/10 dark:hover:text-gray-200"
                          aria-label={`移除 ${t.name}`}
                          onClick={() => removeTable(t.name)}
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-h-0 overflow-hidden lg:min-h-[360px]">
          {dataSourceId ? (
            <SchemaBrowser
              key={dataSourceId}
              dataSourceId={dataSourceId}
              embedded
              defaultDatabase={selectedDs?.database}
              focusTable={focusTable}
              className="h-full min-h-0"
              onSelectionChange={setSelection}
              addedTableNames={selectedNames}
              onAddTable={readOnlyTables ? undefined : addTable}
            />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center px-6 text-center">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">请先选择数据源。</p>
            </div>
          )}
        </div>
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
      <p className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
        提示：表树中 <span className="font-medium text-gray-700 dark:text-gray-300">双击</span> 或点{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">+</span> 快速添加；选中表后按{" "}
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px] dark:border-gray-700 dark:bg-white/5">
          Enter
        </kbd>{" "}
        亦可添加。
      </p>
    </div>
  );
}

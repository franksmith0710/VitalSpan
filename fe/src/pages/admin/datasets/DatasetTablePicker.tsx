import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { SchemaTreePanel } from "@/components/datasources/SchemaTreePanel";
import { TableColumnsPanel } from "@/components/datasources/TableColumnsPanel";
import {
  matchesSearch,
  partitionSchemas,
  qualifiedTableName,
  type TableMeta,
  type TableSelection,
} from "@/components/datasources/schemaBrowserUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { queryKeys } from "@/lib/queryKeys";
import type { DatasetTable } from "./types";

type DsItem = { id: string; name: string; database?: string };

export function DatasetTablePicker({
  tables,
  onChange,
}: {
  tables: DatasetTable[];
  onChange: (next: DatasetTable[]) => void;
}) {
  const [dataSourceId, setDataSourceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideSystem, setHideSystem] = useState(true);
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [selection, setSelection] = useState<TableSelection | null>(null);
  const initRef = useRef(false);

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const items = dsQuery.data?.items ?? [];
  const selectedDs = items.find((d) => d.id === dataSourceId);

  useEffect(() => {
    if (!dataSourceId && items[0]) setDataSourceId(items[0].id);
  }, [dataSourceId, items]);

  useEffect(() => {
    initRef.current = false;
    setSelection(null);
    setExpandedSchemas({});
  }, [dataSourceId]);

  const schemasQuery = useQuery({
    queryKey: queryKeys.datasources.schemas(dataSourceId),
    queryFn: () => apiFetch<{ items: Array<{ name: string }> }>(`/api/v1/datasources/${dataSourceId}/schemas`),
    enabled: Boolean(dataSourceId),
  });

  const schemaNames = useMemo(
    () => (schemasQuery.data?.items ?? []).map((s) => s.name),
    [schemasQuery.data?.items],
  );
  const { user: userSchemas, system: systemSchemas } = useMemo(
    () => partitionSchemas(schemaNames, selectedDs?.database),
    [schemaNames, selectedDs?.database],
  );
  const filteredUserSchemas = useMemo(
    () => userSchemas.filter((s) => matchesSearch(s, searchQuery)),
    [searchQuery, userSchemas],
  );

  useEffect(() => {
    if (!schemaNames.length) return;
    const preferred =
      (selectedDs?.database && schemaNames.includes(selectedDs.database) && selectedDs.database) ||
      userSchemas[0] ||
      schemaNames[0];
    if (preferred) setExpandedSchemas((s) => ({ ...s, [preferred]: true }));
  }, [schemaNames, selectedDs?.database, userSchemas]);

  const handleTablesLoaded = useCallback((schema: string, loaded: TableMeta[]) => {
    if (initRef.current || !loaded.length) return;
    initRef.current = true;
    setSelection({ schema, table: loaded[0].name, type: loaded[0].type });
  }, []);

  const selectedNames = useMemo(() => new Set(tables.map((t) => t.name)), [tables]);

  const addSelection = () => {
    if (!selection) return;
    const name = qualifiedTableName(selection.schema, selection.table);
    if (selectedNames.has(name) || selectedNames.has(selection.table)) return;
    onChange([...tables, { name }]);
  };

  const removeTable = (name: string) => {
    onChange(tables.filter((t) => t.name !== name));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="dataset-datasource">数据源</Label>
          {dsQuery.isLoading ? (
            <Skeleton className="h-11 w-full" />
          ) : items.length === 0 ? (
            <p className="text-theme-xs text-gray-500">暂无可用数据源，请先在「数据源」中创建。</p>
          ) : !dataSourceId ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            <Select value={dataSourceId} onValueChange={setDataSourceId}>
              <SelectTrigger id="dataset-datasource" className="h-11" aria-label="选择数据源">
                <SelectValue placeholder="选择数据源以浏览表" />
              </SelectTrigger>
              <SelectContent>
                {items.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {dataSourceId ? (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ds-hide-system"
                checked={hideSystem}
                onCheckedChange={(v) => setHideSystem(v === true)}
              />
              <Label htmlFor="ds-hide-system" className="cursor-pointer text-theme-xs text-gray-600 dark:text-gray-400">
                隐藏系统库
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!selection}
              onClick={addSelection}
            >
              <Plus className="size-4" aria-hidden />
              添加当前表
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <span className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">已选表</span>
          <Badge variant="light" color={tables.length > 0 ? "primary" : "light"} size="sm">
            {tables.length}
          </Badge>
        </div>
        <div className="max-h-28 overflow-y-auto overscroll-y-contain px-3 py-2.5">
          {tables.length === 0 ? (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">在下方 Schema 浏览器中选择表并添加</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tables.map((t) => (
                <Badge key={t.name} variant="light" color="primary" size="sm" className="max-w-full gap-1">
                  <span className="truncate">{t.name}</span>
                  <button type="button" aria-label={`移除 ${t.name}`} onClick={() => removeTable(t.name)}>
                    <X className="size-3 shrink-0" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {dataSourceId ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
            <SearchField
              className="w-full sm:max-w-sm"
              inputClassName="h-10"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="搜索 Schema 或表名…"
              aria-label="搜索元数据"
            />
          </div>
          {schemasQuery.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-[320px] w-full rounded-lg" />
            </div>
          ) : (
            <div className="grid h-[400px] min-h-0 overflow-hidden lg:grid-cols-[minmax(220px,280px)_1fr]">
              <SchemaTreePanel
                dataSourceId={dataSourceId}
                userSchemas={filteredUserSchemas}
                systemSchemas={systemSchemas}
                hideSystem={hideSystem}
                defaultDatabase={selectedDs?.database}
                searchQuery={searchQuery}
                expandedSchemas={expandedSchemas}
                selection={selection}
                onToggleSchema={(schema) =>
                  setExpandedSchemas((s) => ({ ...s, [schema]: !s[schema] }))
                }
                onSelectTable={(schema, table) =>
                  setSelection({ schema, table: table.name, type: table.type })
                }
                onTablesLoaded={handleTablesLoaded}
              />
              <TableColumnsPanel dataSourceId={dataSourceId} selection={selection} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-theme-xs text-gray-500">请先选择数据源。</p>
      )}
    </div>
  );
}

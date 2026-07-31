import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import { qualifiedTableName, type TableSelection } from "@/components/datasources/schemaBrowserUtils";
import { Badge } from "@/components/ui/badge";
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
  const [selection, setSelection] = useState<TableSelection | null>(null);

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const items = dsQuery.data?.items ?? [];
  const selectedDs = items.find((d) => d.id === dataSourceId);

  useEffect(() => {
    if (!dataSourceId && items[0]) setDataSourceId(items[0].id);
  }, [dataSourceId, items]);

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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid shrink-0 gap-2 sm:max-w-sm">
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

      <div className="shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <SchemaBrowser
            key={dataSourceId}
            dataSourceId={dataSourceId}
            embedded
            defaultDatabase={selectedDs?.database}
            className="min-h-0 flex-1"
            onSelectionChange={setSelection}
            toolbarActions={
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
            }
          />
        </div>
      ) : (
        <p className="text-theme-xs text-gray-500">请先选择数据源。</p>
      )}
    </div>
  );
}

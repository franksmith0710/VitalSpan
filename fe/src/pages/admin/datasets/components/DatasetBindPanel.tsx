import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table2 } from "lucide-react";
import { toast } from "sonner";
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
import { mapApiError } from "@/lib/apiError";
import { createAndBindDatasetQueryConfig } from "@/lib/datasetChartBinding";
import { parseQualifiedTable } from "@/lib/datasetTableUtils";
import { queryKeys } from "@/lib/queryKeys";
import type { DatasetTable } from "../types";

type DsItem = { id: string; name: string; code: string; type: string };

export function DatasetBindPanel({
  datasetId,
  tables,
  boundConfigId,
  onBound,
}: {
  datasetId: string;
  tables: DatasetTable[];
  boundConfigId?: string | null;
  onBound: () => void;
}) {
  const [dataSourceId, setDataSourceId] = useState("");
  const [tableName, setTableName] = useState("");
  const [binding, setBinding] = useState(false);

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const items = dsQuery.data?.items ?? [];
  const selectedDs = items.find((d) => d.id === dataSourceId);
  const parsed = tableName ? parseQualifiedTable(tableName) : null;

  useEffect(() => {
    if (!dataSourceId && items[0]) setDataSourceId(items[0].id);
  }, [dataSourceId, items]);

  useEffect(() => {
    if (!tableName && tables[0]) setTableName(tables[0].name);
  }, [tableName, tables]);

  const columnsQuery = useQuery({
    queryKey: queryKeys.datasources.columns(
      dataSourceId,
      parsed?.schema ?? "",
      parsed?.table ?? "",
    ),
    queryFn: () =>
      apiFetch<{ items: Array<{ name: string }> }>(
        `/api/v1/datasources/${dataSourceId}/columns?schema=${encodeURIComponent(parsed!.schema)}&table=${encodeURIComponent(parsed!.table)}`,
      ),
    enabled: Boolean(dataSourceId && parsed?.table),
  });

  const columnNames = useMemo(
    () => (columnsQuery.data?.items ?? []).map((c) => c.name),
    [columnsQuery.data?.items],
  );

  const handleBind = async () => {
    if (!selectedDs || !tableName || columnNames.length === 0) return;
    setBinding(true);
    try {
      await createAndBindDatasetQueryConfig({
        datasetId,
        dataSourceId: selectedDs.id,
        connectorType: selectedDs.type,
        tableName,
        columns: columnNames,
      });
      toast.success("查询配置已绑定");
      onBound();
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setBinding(false);
    }
  };

  if (tables.length === 0) return null;

  return (
    <section className="grid gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">绑定查询配置</h3>
          {boundConfigId ? (
            <Badge variant="light" color="success" size="sm">
              已绑定
            </Badge>
          ) : (
            <Badge variant="light" color="warning" size="sm">
              未绑定
            </Badge>
          )}
        </div>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          将 Dataset 主表映射为 dataset_query 配置，仪表板选此 Dataset 即可出图（P0：单表）。
        </p>
      </div>

      <div className="grid gap-5">
        {boundConfigId ? (
          <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
            配置 ID：{boundConfigId.slice(0, 8)}…
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="bind-ds">数据源</Label>
            <Select value={dataSourceId || undefined} onValueChange={setDataSourceId}>
              <SelectTrigger id="bind-ds" className="h-11">
                <SelectValue placeholder={dsQuery.isLoading ? "加载中…" : "选择数据源"} />
              </SelectTrigger>
              <SelectContent>
                {items.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>
                    {ds.name} ({ds.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bind-table">主表</Label>
            <Select value={tableName || undefined} onValueChange={setTableName}>
              <SelectTrigger id="bind-table" className="h-11">
                <SelectValue placeholder="选择 Dataset 中的表" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Table2 className="size-4 text-gray-400" aria-hidden />
            <Label>字段预览</Label>
          </div>
          {columnsQuery.isLoading ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : columnNames.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex flex-wrap gap-1.5">
                {columnNames.map((col) => (
                  <Badge key={col} variant="light" color="light" size="sm">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              选择数据源与主表后加载列信息。
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={!selectedDs || !tableName || columnNames.length === 0 || binding}
            loading={binding}
            loadingText="绑定中…"
            onClick={() => void handleBind()}
          >
            {boundConfigId ? "重新绑定" : "绑定并预览"}
          </Button>
        </div>
      </div>
    </section>
  );
}

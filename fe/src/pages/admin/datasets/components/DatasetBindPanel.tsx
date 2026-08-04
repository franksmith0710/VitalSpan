import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { ANALYTICS_DATASOURCE_CODE, isAnalyticsDatasource } from "@/lib/datasourceRoles";
import { parseQualifiedTable } from "@/lib/datasetTableUtils";
import { queryKeys } from "@/lib/queryKeys";
import type { DatasetOrigin, DatasetTable } from "../types";

type DsItem = { id: string; name: string; code: string; type: string };

export function DatasetBindPanel({
  datasetId,
  tables,
  boundConfigId,
  origin = "manual",
  syncJobId,
  onBound,
}: {
  datasetId: string;
  tables: DatasetTable[];
  boundConfigId?: string | null;
  origin?: DatasetOrigin;
  syncJobId?: string | null;
  onBound: () => void;
}) {
  const isSyncOrigin = origin === "sync_job";
  const [dataSourceId, setDataSourceId] = useState("");
  const [tableName, setTableName] = useState("");
  const [binding, setBinding] = useState(false);

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const allItems = dsQuery.data?.items ?? [];
  const selectableItems = useMemo(() => {
    if (!isSyncOrigin) return allItems;
    const analytics = allItems.filter((item) => isAnalyticsDatasource(item.code));
    return analytics.length > 0 ? analytics : allItems.filter((item) => item.type === "postgres");
  }, [allItems, isSyncOrigin]);

  const selectedDs = selectableItems.find((d) => d.id === dataSourceId);
  const parsed = tableName ? parseQualifiedTable(tableName) : null;

  useEffect(() => {
    if (dataSourceId) return;
    const preferred = selectableItems.find((item) => isAnalyticsDatasource(item.code));
    const fallback = selectableItems[0];
    if (preferred) setDataSourceId(preferred.id);
    else if (fallback) setDataSourceId(fallback.id);
  }, [dataSourceId, selectableItems]);

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
    enabled: Boolean(dataSourceId && parsed?.table && !(isSyncOrigin && boundConfigId)),
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
          <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">出图查询绑定</h3>
          {boundConfigId ? (
            <Badge variant="light" color="success" size="sm">
              已绑定
            </Badge>
          ) : (
            <Badge variant="light" color="warning" size="sm">
              未绑定
            </Badge>
          )}
          {isSyncOrigin ? (
            <Badge variant="light" color="primary" size="sm">
              同步产物
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {isSyncOrigin
            ? "此 Dataset 承接同步任务写入的托管分析库表；出图查询绑定锁定为分析库连接，与同步读端不同。"
            : "将 Dataset 主表映射为查询配置，仪表板选此 Dataset 即可出图（P0：单表）。"}
        </p>
      </div>

      {isSyncOrigin ? (
        <Alert variant="info">
          <AlertTitle>来自同步任务</AlertTitle>
          <AlertDescription className="text-theme-xs">
            {syncJobId ? (
              <>
                同步任务 ID：
                <span className="font-mono"> {syncJobId.slice(0, 8)}…</span>。
              </>
            ) : null}
            图表将查询托管分析库（code
            <span className="font-mono"> {ANALYTICS_DATASOURCE_CODE}</span>）中的同步产出表，不能改绑到其他连接。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5">
        {boundConfigId ? (
          <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
            配置 ID：{boundConfigId.slice(0, 8)}…
          </p>
        ) : null}

        {isSyncOrigin && boundConfigId ? (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-theme-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <p>
              <span className="text-gray-500 dark:text-gray-400">出图查询连接：</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {selectedDs?.name ?? "托管分析库"}
              </span>
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-400">主表：</span>
              <span className="font-mono text-theme-xs">{tableName || tables[0]?.name}</span>
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              同步产物绑定已锁定。若需查询其他库表，请新建「手动 Dataset」。
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="bind-ds">{isSyncOrigin ? "出图查询连接（托管分析库）" : "出图查询连接"}</Label>
                {isSyncOrigin ? (
                  <p className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-theme-sm dark:border-gray-800 dark:bg-white/[0.02]">
                    {selectedDs?.name ?? "加载中…"}
                  </p>
                ) : (
                  <Select value={dataSourceId || undefined} onValueChange={setDataSourceId}>
                    <SelectTrigger id="bind-ds" className="h-11">
                      <SelectValue placeholder={dsQuery.isLoading ? "加载中…" : "选择连接"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableItems.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          {ds.name} ({ds.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bind-table">主表</Label>
                {isSyncOrigin ? (
                  <p className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 font-mono text-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
                    {tableName || tables[0]?.name}
                  </p>
                ) : (
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
                )}
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
                  选择连接与主表后加载列信息。
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
          </>
        )}
      </div>
    </section>
  );
}

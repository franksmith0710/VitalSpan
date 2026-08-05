import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table2 } from "lucide-react";
import { toast } from "sonner";
import {
  groupDatasetFields,
  suggestDatasetBindColumns,
} from "@/components/dashboard/datasetFieldClassification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  fetchDatasetQueryConfig,
  saveAndBindDatasetQueryConfig,
} from "@/lib/datasetChartBinding";
import {
  ANALYTICS_DATASOURCE_CODE,
  ANALYTICS_DATASOURCE_NAME,
  filterSyncJobBindDatasources,
  resolveAnalyticsDatasourceId,
} from "@/lib/datasourceRoles";
import { parseQualifiedTable } from "@/lib/datasetTableUtils";
import { refreshSyncDatasetBinding } from "@/lib/syncConsumeApi";
import { queryKeys } from "@/lib/queryKeys";
import type { DatasetOrigin, DatasetTable } from "../types";

type DsItem = { id: string; name: string; code?: string; type: string; port?: number; database?: string };

function qualifiedTableFromBinding(schema?: string, table?: string): string {
  if (!table) return "";
  if (schema) return `${schema}.${table}`;
  return table;
}

export function DatasetBindPanel({
  datasetId,
  tables,
  boundConfigId,
  tableSourceDataSourceId,
  origin = "manual",
  syncJobId,
  onBound,
}: {
  datasetId: string;
  tables: DatasetTable[];
  boundConfigId?: string | null;
  tableSourceDataSourceId?: string;
  origin?: DatasetOrigin;
  syncJobId?: string | null;
  onBound: () => void;
}) {
  const isSyncOrigin = origin === "sync_job";
  const queryClient = useQueryClient();
  const [dataSourceId, setDataSourceId] = useState("");
  const [tableName, setTableName] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [binding, setBinding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [columnPickKey, setColumnPickKey] = useState("");
  const columnsTouchedRef = useRef(false);
  const primaryTableName = tables[0]?.name ?? "";

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DsItem[] }>("/api/v1/datasources"),
  });

  const boundConfigQuery = useQuery({
    queryKey: ["query-config", boundConfigId ?? ""],
    queryFn: () => fetchDatasetQueryConfig(boundConfigId!),
    enabled: Boolean(boundConfigId),
  });

  const allItems = dsQuery.data?.items ?? [];
  const selectableItems = useMemo(
    () => (isSyncOrigin ? filterSyncJobBindDatasources(allItems) : allItems),
    [allItems, isSyncOrigin],
  );

  const activeDs = useMemo(() => {
    const fromAll = allItems.find((d) => d.id === dataSourceId);
    if (fromAll) return fromAll;
    const fromSelectable = selectableItems.find((d) => d.id === dataSourceId);
    if (fromSelectable) return fromSelectable;
    if (isSyncOrigin && dataSourceId) {
      return {
        id: dataSourceId,
        name: ANALYTICS_DATASOURCE_NAME,
        type: "postgresql",
      } satisfies DsItem;
    }
    return selectableItems[0];
  }, [allItems, dataSourceId, isSyncOrigin, selectableItems]);

  const parsed = tableName ? parseQualifiedTable(tableName) : null;

  useEffect(() => {
    if (dsQuery.isLoading) return;
    const candidates = selectableItems.length > 0 ? selectableItems : allItems;
    if (candidates.length === 0 && !boundConfigQuery.data?.dataSourceId) return;

    setDataSourceId((current) => {
      if (current && (allItems.some((d) => d.id === current) || (isSyncOrigin && current))) {
        return current;
      }
      const boundId = boundConfigQuery.data?.dataSourceId;
      if (boundId) return boundId;
      const preferred = tableSourceDataSourceId ?? undefined;
      const resolved = resolveAnalyticsDatasourceId(candidates, preferred);
      return resolved || current;
    });
  }, [
    allItems,
    boundConfigQuery.data?.dataSourceId,
    dsQuery.isLoading,
    isSyncOrigin,
    selectableItems,
    tableSourceDataSourceId,
  ]);

  useEffect(() => {
    if (boundConfigQuery.data) {
      const boundTable = qualifiedTableFromBinding(
        boundConfigQuery.data.schema,
        boundConfigQuery.data.table,
      );
      if (boundTable) setTableName(boundTable);
      return;
    }
    if (!tableName && primaryTableName) setTableName(primaryTableName);
  }, [
    boundConfigQuery.data?.schema,
    boundConfigQuery.data?.table,
    primaryTableName,
    tableName,
  ]);

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

  const activeColumnPickKey = `${dataSourceId}:${tableName}`;

  useEffect(() => {
    columnsTouchedRef.current = false;
    setColumnPickKey("");
  }, [activeColumnPickKey]);

  useEffect(() => {
    if (binding || refreshing || columnsTouchedRef.current) return;
    if (columnPickKey === activeColumnPickKey) return;
    if (boundConfigId && boundConfigQuery.isLoading) return;

    setColumnPickKey(activeColumnPickKey);

    if (boundConfigQuery.data?.columns?.length && boundConfigId) {
      const boundTable = qualifiedTableFromBinding(
        boundConfigQuery.data.schema,
        boundConfigQuery.data.table,
      );
      if (!boundTable || boundTable === tableName) {
        setSelectedColumns(boundConfigQuery.data.columns);
        return;
      }
    }

    if (columnNames.length > 0) {
      setSelectedColumns(suggestDatasetBindColumns(columnNames));
    } else {
      setSelectedColumns([]);
    }
  }, [
    activeColumnPickKey,
    boundConfigId,
    boundConfigQuery.data,
    boundConfigQuery.isLoading,
    columnNames,
    columnPickKey,
    tableName,
    binding,
    refreshing,
  ]);

  const toggleColumn = (name: string, checked: boolean) => {
    columnsTouchedRef.current = true;
    setSelectedColumns((current) => {
      if (checked) return current.includes(name) ? current : [...current, name];
      return current.filter((c) => c !== name);
    });
  };

  const handleAutoColumns = () => {
    if (columnNames.length === 0) return;
    columnsTouchedRef.current = true;
    setSelectedColumns(suggestDatasetBindColumns(columnNames));
  };

  const handleSelectAllColumns = () => {
    columnsTouchedRef.current = true;
    setSelectedColumns([...columnNames]);
  };

  const handleBind = async () => {
    if (!activeDs || !tableName || selectedColumns.length === 0) {
      toast.error("请选择至少一个绑定字段");
      return;
    }
    setBinding(true);
    try {
      await saveAndBindDatasetQueryConfig({
        datasetId,
        boundConfigId,
        dataSourceId: activeDs.id,
        connectorType: activeDs.type || "postgresql",
        tableName,
        columns: selectedColumns,
      });
      await queryClient.invalidateQueries({ queryKey: ["query-config"] });
      columnsTouchedRef.current = false;
      setColumnPickKey("");
      toast.success(
        boundConfigId
          ? `已更新出图绑定（${selectedColumns.length} 列）`
          : "查询配置已绑定",
      );
      onBound();
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setBinding(false);
    }
  };

  const handleRefreshSyncBinding = async () => {
    if (!syncJobId) return;
    setRefreshing(true);
    try {
      const result = await refreshSyncDatasetBinding(syncJobId);
      columnsTouchedRef.current = false;
      setColumnPickKey("");
      setSelectedColumns(result.columns);
      toast.success(`已刷新绑定列（${result.columns.length} 列）`);
      onBound();
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setRefreshing(false);
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
            : "将 Dataset 主表映射为查询配置；字段可自动识别，也可手动勾选。"}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="bind-ds">{isSyncOrigin ? "出图查询连接（托管分析库）" : "出图查询连接"}</Label>
            {isSyncOrigin ? (
              <p className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-theme-sm dark:border-gray-800 dark:bg-white/[0.02]">
                {dsQuery.isLoading
                  ? "加载中…"
                  : (activeDs?.name ?? ANALYTICS_DATASOURCE_NAME)}
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
              <p
                id="bind-table"
                className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 font-mono text-theme-xs dark:border-gray-800 dark:bg-white/[0.02]"
              >
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Table2 className="size-4 text-gray-400" aria-hidden />
              <Label>绑定字段</Label>
              <Badge variant="light" color="light" size="sm">
                已选 {selectedColumns.length}/{columnNames.length || "—"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAutoColumns} disabled={columnNames.length === 0}>
                自动识别
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAllColumns} disabled={columnNames.length === 0}>
                全选
              </Button>
            </div>
          </div>
          {columnsQuery.isLoading || boundConfigQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : columnNames.length > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {columnNames.map((col) => {
                  const kind = groupDatasetFields([col]);
                  const badge =
                    kind.metrics.length > 0 ? (
                      <Badge variant="light" color="success" size="sm">
                        指标
                      </Badge>
                    ) : (
                      <Badge variant="light" color="primary" size="sm">
                        维度
                      </Badge>
                    );
                  return (
                    <li key={col}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white/80 dark:hover:bg-white/5">
                        <Checkbox
                          checked={selectedColumns.includes(col)}
                          onCheckedChange={(checked) => toggleColumn(col, checked === true)}
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-theme-xs">{col}</span>
                        {badge}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              选择连接与主表后加载列信息，可自动识别或手动勾选。
            </p>
          )}
          {isSyncOrigin && boundConfigId ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              连接与主表已锁定；可调整绑定字段后点「重新绑定」更新出图列。
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {isSyncOrigin && syncJobId && boundConfigId ? (
            <Button
              type="button"
              variant="outline"
              disabled={refreshing || binding}
              loading={refreshing}
              loadingText="刷新中…"
              onClick={() => void handleRefreshSyncBinding()}
            >
              刷新绑定（自动识别）
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            disabled={!activeDs || !tableName || selectedColumns.length === 0 || binding || refreshing}
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

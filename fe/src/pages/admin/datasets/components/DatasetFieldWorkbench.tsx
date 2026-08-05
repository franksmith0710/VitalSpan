import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Hash, Table2, Type } from "lucide-react";
import { toast } from "sonner";
import { classifyDatasetField, resolveFieldKind } from "@/components/dashboard/datasetFieldClassification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapApiError } from "@/lib/apiError";
import { ANALYTICS_DATASOURCE_CODE } from "@/lib/datasourceRoles";
import { fetchTablePreview } from "@/lib/datasetTablePreview";
import { parseQualifiedTable } from "@/lib/datasetTableUtils";
import { refreshSyncDatasetBinding } from "@/lib/syncConsumeApi";
import type { DatasetBindDraft, DatasetOrigin } from "../types";
import {
  autoIdentifyDraft,
  resolveKindForField,
  selectAllDraft,
  toggleColumnInDraft,
  toggleFieldKind,
} from "./datasetFieldWorkbenchState";

function FieldKindIcon({ field, draft }: { field: string; draft: DatasetBindDraft }) {
  const kind = resolveKindForField(field, draft);
  if (kind === "metric") return <Hash className="size-3.5 text-success-500" aria-hidden />;
  if (/(?:^|_)(date|time|day|month|year|week)(?:$|_)/i.test(field)) {
    return <Calendar className="size-3.5 text-brand-500" aria-hidden />;
  }
  return <Type className="size-3.5 text-brand-500" aria-hidden />;
}

export function DatasetFieldWorkbench({
  dataSourceId,
  connectorType = "postgresql",
  tableName,
  columnNames,
  columnsLoading,
  bindDraft,
  onBindDraftChange,
  boundConfigId,
  origin = "manual",
  syncJobId,
  onRefreshBinding,
}: {
  dataSourceId: string;
  connectorType?: string;
  tableName: string;
  columnNames: string[];
  columnsLoading: boolean;
  bindDraft: DatasetBindDraft;
  onBindDraftChange: (next: DatasetBindDraft) => void;
  boundConfigId?: string | null;
  origin?: DatasetOrigin;
  syncJobId?: string | null;
  onRefreshBinding?: () => void;
}) {
  const isSyncOrigin = origin === "sync_job";
  const parsed = parseQualifiedTable(tableName);
  const [refreshing, setRefreshing] = useState(false);
  const allColumnNames = useMemo(() => {
    const merged = new Set([...columnNames, ...bindDraft.selectedColumns]);
    return [...merged];
  }, [bindDraft.selectedColumns, columnNames]);
  const previewColumns =
    bindDraft.selectedColumns.length > 0 ? bindDraft.selectedColumns : allColumnNames;

  const previewQuery = useQuery({
    queryKey: ["dataset-preview", dataSourceId, parsed.schema, parsed.table, previewColumns.join(",")],
    queryFn: () =>
      fetchTablePreview({
        dataSourceId,
        schema: parsed.schema || "public",
        table: parsed.table,
        columns: bindDraft.selectedColumns.length > 0 ? bindDraft.selectedColumns : undefined,
        limit: 20,
      }),
    enabled: Boolean(dataSourceId && parsed.table && allColumnNames.length > 0),
  });

  const { dimensions, metrics } = useMemo(() => {
    const dims: string[] = [];
    const mets: string[] = [];
    for (const col of allColumnNames) {
      if (resolveKindForField(col, bindDraft) === "metric") mets.push(col);
      else dims.push(col);
    }
    return { dimensions: dims, metrics: mets };
  }, [allColumnNames, bindDraft]);

  const handleRefreshSync = async () => {
    if (!syncJobId) return;
    setRefreshing(true);
    try {
      const result = await refreshSyncDatasetBinding(syncJobId);
      onBindDraftChange({
        selectedColumns: result.columns,
        columnKinds: Object.fromEntries(
          result.columns.map((c) => [c, bindDraft.columnKinds[c] ?? classifyDatasetField(c)]),
        ),
      });
      toast.success(`已刷新绑定列（${result.columns.length} 列）`);
      onRefreshBinding?.();
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setRefreshing(false);
    }
  };

  if (!tableName) return null;

  return (
    <section className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Table2 className="size-4 text-gray-400" aria-hidden />
          <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">字段工作台</h3>
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
        <Badge variant="light" color="light" size="sm" data-testid="bind-selected-count">
          已选 {bindDraft.selectedColumns.length}/{allColumnNames.length || "—"}
        </Badge>
      </div>

      {isSyncOrigin ? (
        <Alert variant="info">
          <AlertTitle>来自同步任务</AlertTitle>
          <AlertDescription className="text-theme-xs">
            {syncJobId ? (
              <>
                同步任务 ID：<span className="font-mono"> {syncJobId.slice(0, 8)}…</span>。
              </>
            ) : null}
            图表将查询托管分析库（code
            <span className="font-mono"> {ANALYTICS_DATASOURCE_CODE}</span>）中的同步产出表；保存 Dataset 后出图字段生效。
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          勾选出图字段、切换维/指标类型；保存 Dataset 时自动更新绑定配置。
        </p>
      )}

      <Tabs defaultValue="fields" className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList variant="enclosed" size="sm">
            <TabsTrigger value="fields">字段管理</TabsTrigger>
            <TabsTrigger value="preview">数据预览</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={columnNames.length === 0}
              onClick={() => onBindDraftChange(autoIdentifyDraft(columnNames))}
            >
              自动识别
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={columnNames.length === 0}
              onClick={() => onBindDraftChange(selectAllDraft(columnNames))}
            >
              全选
            </Button>
            {isSyncOrigin && syncJobId && boundConfigId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={refreshing}
                loading={refreshing}
                loadingText="刷新中…"
                onClick={() => void handleRefreshSync()}
              >
                刷新绑定（自动识别）
              </Button>
            ) : null}
          </div>
        </div>

        <TabsContent value="fields" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
          {columnsLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : columnNames.length === 0 ? (
            <p className="text-theme-xs text-gray-500">加载列信息中…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { title: "维度", fields: dimensions },
                { title: "指标", fields: metrics },
              ].map(({ title, fields }) => (
                <div key={title} className="grid gap-2">
                  <Label className="text-theme-xs text-gray-600 dark:text-gray-400">{title}</Label>
                  <ul className="max-h-none space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.02] lg:max-h-56">
                    {fields.length === 0 ? (
                      <li className="px-2 py-1 text-theme-xs text-gray-400">无</li>
                    ) : (
                      fields.map((col) => (
                        <li key={col} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-white/5">
                          <Checkbox
                            aria-label={col}
                            checked={bindDraft.selectedColumns.includes(col)}
                            onCheckedChange={(checked) =>
                              onBindDraftChange(toggleColumnInDraft(bindDraft, col, checked === true))
                            }
                          />
                          <FieldKindIcon field={col} draft={bindDraft} />
                          <span className="min-w-0 flex-1 truncate font-mono text-theme-xs">{col}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => onBindDraftChange(toggleFieldKind(bindDraft, col))}
                          >
                            转{resolveKindForField(col, bindDraft) === "metric" ? "维度" : "指标"}
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
          {previewQuery.isLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : previewQuery.data?.columns.length ? (
            <div className="custom-scrollbar max-h-none min-h-[160px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 lg:max-h-64">
              <table className="w-full min-w-max text-left text-theme-xs">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900">
                  <tr>
                    {previewQuery.data.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-2 py-1.5 font-medium">
                        <span className="font-mono">{col}</span>
                        <Badge variant="light" color="light" size="sm" className="ml-1">
                          {resolveKindForField(col, bindDraft) === "metric" ? "指标" : "维度"}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewQuery.data.rows.slice(0, 20).map((row, ri) => (
                    <tr key={ri} className="border-t border-gray-100 dark:border-gray-800">
                      {row.map((cell, ci) => (
                        <td key={ci} className="whitespace-nowrap px-2 py-1 font-mono text-gray-600 dark:text-gray-300">
                          {cell == null ? "—" : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-theme-xs text-gray-500">暂无预览数据</p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

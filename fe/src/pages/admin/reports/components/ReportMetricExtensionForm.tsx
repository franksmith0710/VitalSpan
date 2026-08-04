import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { ReportMetricDatasetFields } from "./ReportMetricDatasetFields";
import { type ExtensionMetric, useReportTemplates } from "../useReportTemplates";

type DatasourceItem = { id: string; name: string };

const EMPTY_FORM = {
  metricKey: "",
  metricLabel: "",
  queryMode: "sql" as const,
  expression: "",
  datasetId: "",
  boundConfigId: "",
};

function buildMetricFromForm(form: typeof EMPTY_FORM): ExtensionMetric | null {
  if (!form.metricKey.trim() || !form.metricLabel.trim()) return null;
  const base = { key: form.metricKey.trim(), label: form.metricLabel.trim(), visible: true };
  if (form.queryMode === "dataset") {
    return {
      ...base,
      queryMode: "dataset",
      datasetId: form.datasetId.trim(),
      boundConfigId: form.boundConfigId.trim(),
    };
  }
  return { ...base, queryMode: "sql", expression: form.expression.trim() || null };
}

function formFromMetric(metric: ExtensionMetric) {
  return {
    metricKey: metric.key,
    metricLabel: metric.label,
    queryMode: metric.queryMode === "dataset" ? ("dataset" as const) : ("sql" as const),
    expression: metric.expression ?? "",
    datasetId: metric.datasetId ?? "",
    boundConfigId: metric.boundConfigId ?? "",
  };
}

export function ReportMetricExtensionForm({
  nodeId,
  readOnly,
  metrics,
  filters,
  defaultDataSourceId,
  isLoading,
}: {
  nodeId: string;
  readOnly: boolean;
  metrics: ExtensionMetric[];
  filters: Array<{ key: string; operator: string }>;
  defaultDataSourceId?: string | null;
  isLoading: boolean;
}) {
  const [draftMetrics, setDraftMetrics] = useState<ExtensionMetric[]>(metrics);
  const [defaultDsId, setDefaultDsId] = useState(defaultDataSourceId ?? "");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changeNote, setChangeNote] = useState("");
  const { saveExtension } = useReportTemplates(null);

  const dsQuery = useQuery({
    queryKey: ["reports", "datasources", "picker"],
    queryFn: () => apiFetch<{ items: DatasourceItem[] }>("/api/v1/datasources?limit=200"),
    enabled: !readOnly,
  });

  useEffect(() => {
    setDraftMetrics(metrics);
    setDefaultDsId(defaultDataSourceId ?? "");
  }, [metrics, defaultDataSourceId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingKey(null);
  };

  const validateFormMetric = (metric: ExtensionMetric) => {
    if (metric.queryMode === "dataset") {
      if (!metric.datasetId || !metric.boundConfigId) {
        toast.error("数据集模式须选择数据集并完成查询绑定");
        return false;
      }
    } else if (!metric.expression?.trim()) {
      toast.error("SQL 模式须填写 SQL 表达式");
      return false;
    }
    return true;
  };

  const handleApplyMetric = () => {
    const metric = buildMetricFromForm(form);
    if (!metric) {
      toast.error("请填写指标键与显示名");
      return;
    }
    if (!validateFormMetric(metric)) return;
    const duplicate = draftMetrics.some((m) => m.key === metric.key && m.key !== editingKey);
    if (duplicate) {
      toast.error("指标键已存在");
      return;
    }
    setDraftMetrics((prev) => {
      if (editingKey) return prev.map((m) => (m.key === editingKey ? metric : m));
      return [...prev, metric];
    });
    resetForm();
  };

  const handleDelete = (key: string) => {
    setDraftMetrics((prev) => prev.filter((m) => m.key !== key));
    if (editingKey === key) resetForm();
  };

  const handleEdit = (metric: ExtensionMetric) => {
    setEditingKey(metric.key);
    setForm(formFromMetric(metric));
  };

  const handleSave = () => {
    if (!changeNote.trim()) {
      toast.error("请填写变更说明");
      return;
    }
    let nextMetrics = [...draftMetrics];
    const pending = buildMetricFromForm(form);
    if (pending) {
      if (!validateFormMetric(pending)) return;
      if (editingKey) {
        nextMetrics = nextMetrics.map((m) => (m.key === editingKey ? pending : m));
      } else if (!nextMetrics.some((m) => m.key === pending.key)) {
        nextMetrics.push(pending);
      }
    }
    saveExtension.mutate(
      {
        nodeId,
        body: {
          catalogNodeId: nodeId,
          metrics: nextMetrics,
          filters,
          changeNote: changeNote.trim(),
          ...(defaultDsId.trim() ? { defaultDataSourceId: defaultDsId.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("扩展配置已保存");
          resetForm();
          setChangeNote("");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      {draftMetrics.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          暂无扩展指标，可在下方添加。
        </p>
      ) : (
        <ul className="space-y-2">
          {draftMetrics.map((m) => (
            <li
              key={m.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-theme-sm dark:border-gray-800"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-800 dark:text-white/90">{m.label}</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="light" color={m.queryMode === "dataset" ? "info" : "light"}>
                    {m.queryMode === "dataset" ? "数据集" : "SQL 查询"}
                  </Badge>
                  <code className="text-theme-xs text-gray-500 dark:text-gray-400">{m.key}</code>
                </div>
              </div>
              {!readOnly ? (
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`编辑 ${m.label}`}
                    onClick={() => handleEdit(m)}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`删除 ${m.label}`}
                    onClick={() => handleDelete(m.key)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {editingKey ? "编辑指标" : "添加指标"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="metric-key">指标键</Label>
              <Input
                id="metric-key"
                value={form.metricKey}
                disabled={Boolean(editingKey)}
                onChange={(e) => setForm((f) => ({ ...f, metricKey: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metric-label">显示名</Label>
              <Input
                id="metric-label"
                value={form.metricLabel}
                onChange={(e) => setForm((f) => ({ ...f, metricLabel: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="query-mode">查数模式</Label>
              <Select
                value={form.queryMode}
                onValueChange={(v) => setForm((f) => ({ ...f, queryMode: v as "sql" | "dataset" }))}
              >
                <SelectTrigger id="query-mode" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sql">SQL 查询</SelectItem>
                  <SelectItem value="dataset">数据集</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default-ds">默认数据源</Label>
              {dsQuery.isLoading ? (
                <Skeleton className="h-11 w-full rounded-lg" />
              ) : (
                <Select value={defaultDsId || undefined} onValueChange={setDefaultDsId}>
                  <SelectTrigger id="default-ds" className="h-11">
                    <SelectValue placeholder="选择 SQL 默认数据源（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dsQuery.data?.items ?? []).map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {form.queryMode === "sql" ? (
            <div className="grid gap-2">
              <Label htmlFor="metric-expression">SQL 表达式</Label>
              <Textarea
                id="metric-expression"
                rows={4}
                placeholder="SELECT SUM(amount) FROM orders WHERE …"
                value={form.expression}
                onChange={(e) => setForm((f) => ({ ...f, expression: e.target.value }))}
              />
            </div>
          ) : (
            <ReportMetricDatasetFields
              datasetId={form.datasetId}
              boundConfigId={form.boundConfigId}
              onDatasetIdChange={(id) => setForm((f) => ({ ...f, datasetId: id }))}
              onBoundConfigIdChange={(id) => setForm((f) => ({ ...f, boundConfigId: id }))}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleApplyMetric}>
              {editingKey ? "更新到列表" : "添加到列表"}
            </Button>
            {editingKey ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                取消编辑
              </Button>
            ) : null}
          </div>
          <div className="grid gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            <Label htmlFor="change-note">变更说明</Label>
            <Textarea
              id="change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
          </div>
          <Button type="button" variant="primary" disabled={saveExtension.isPending} onClick={handleSave}>
            {saveExtension.isPending ? "保存中…" : "保存扩展配置"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

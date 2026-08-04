import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { mapApiError } from "@/lib/apiError";
import { BatchImportPanel } from "./BatchImportPanel";
import { ReportExportCard } from "./ReportExportCard";
import { ReportMetricDatasetFields } from "./ReportMetricDatasetFields";
import { SchedulePanel } from "./SchedulePanel";
import { TemplateBlockEditor } from "./TemplateBlockEditor";
import {
  type CatalogNode,
  useCatalogExtension,
  useExtensionRenderSpec,
  useReportTemplates,
} from "../useReportTemplates";

const KIND_LABELS: Record<NonNullable<CatalogNode["templateKind"]>, string> = {
  word: "Word",
  excel: "Excel",
  pdf: "PDF",
};

function BasicInfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-4">
      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{children}</dd>
    </div>
  );
}

export function TemplateDetailPanel({ node, readOnly }: { node: CatalogNode; readOnly: boolean }) {
  const [tab, setTab] = useState("basic");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricKey, setMetricKey] = useState("");
  const [queryMode, setQueryMode] = useState<"sql" | "dataset">("sql");
  const [datasetId, setDatasetId] = useState("");
  const [boundConfigId, setBoundConfigId] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const { saveExtension } = useReportTemplates(null);
  const extQuery = useCatalogExtension(node.id);
  const renderQuery = useExtensionRenderSpec(node.id, tab === "preview");
  const metrics = extQuery.data?.metrics ?? [];

  const handleSaveExtension = () => {
    if (!changeNote.trim()) {
      toast.error("请填写变更说明");
      return;
    }
    if (metricKey && metricLabel && queryMode === "dataset") {
      if (!datasetId.trim() || !boundConfigId.trim()) {
        toast.error("Dataset 模式须选择 Dataset 并完成查询绑定");
        return;
      }
    }
    const nextMetric =
      metricKey && metricLabel
        ? {
            key: metricKey,
            label: metricLabel,
            visible: true,
            queryMode,
            ...(queryMode === "dataset"
              ? { datasetId: datasetId.trim(), boundConfigId: boundConfigId.trim() }
              : {}),
          }
        : null;
    const nextMetrics = nextMetric ? [...metrics, nextMetric] : metrics;
    saveExtension.mutate(
      {
        nodeId: node.id,
        body: {
          catalogNodeId: node.id,
          metrics: nextMetrics,
          filters: extQuery.data?.filters ?? [],
          changeNote: changeNote.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("扩展配置已保存");
          setMetricKey("");
          setMetricLabel("");
          setDatasetId("");
          setBoundConfigId("");
          setChangeNote("");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">{node.name}</h2>
          {node.templateKind ? (
            <Badge variant="light" color="primary" size="sm">
              {KIND_LABELS[node.templateKind]}
            </Badge>
          ) : null}
        </div>
        {node.templateKey ? (
          <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">{node.templateKey}</p>
        ) : null}
      </div>

      <div className="flex-1 p-6 pt-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-only">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="blocks">模板块</TabsTrigger>
            <TabsTrigger value="extension">扩展配置</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="schedule">调度</TabsTrigger>
            <TabsTrigger value="batch">批量导入</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6 space-y-6">
            <dl className="grid gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
              <BasicInfoRow label="节点类型">报表模板</BasicInfoRow>
              <BasicInfoRow label="模板格式">
                {node.templateKind ? KIND_LABELS[node.templateKind] : "—"}
              </BasicInfoRow>
              <BasicInfoRow label="模板键">{node.templateKey ?? "—"}</BasicInfoRow>
            </dl>
            <ReportExportCard defaultTemplateId={node.id} />
          </TabsContent>

          <TabsContent value="blocks" className="mt-6">
            {node.templateKey && node.templateKind ? (
              <TemplateBlockEditor
                templateKey={node.templateKey}
                format={node.templateKind}
                displayName={node.name}
                readOnly={readOnly}
              />
            ) : (
              <p className="text-theme-sm text-gray-500">请先为模板节点设置 templateKey。</p>
            )}
          </TabsContent>

          <TabsContent value="extension" className="mt-6 space-y-4">
            {extQuery.isLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : null}
            {metrics.length === 0 && !extQuery.isLoading ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                暂无扩展指标，可在下方添加。
              </p>
            ) : (
              <ul className="space-y-2">
                {metrics.map((m) => (
                  <li
                    key={m.key}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-theme-sm dark:border-gray-800"
                  >
                    <span className="font-medium text-gray-800 dark:text-white/90">{m.label}</span>
                    <div className="flex items-center gap-2">
                      {"queryMode" in m && m.queryMode === "dataset" ? (
                        <Badge variant="light" color="info">
                          Dataset
                        </Badge>
                      ) : null}
                      <code className="text-theme-xs text-gray-500 dark:text-gray-400">{m.key}</code>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!readOnly ? (
              <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="metric-key">指标键</Label>
                    <Input id="metric-key" value={metricKey} onChange={(e) => setMetricKey(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="metric-label">显示名</Label>
                    <Input id="metric-label" value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="query-mode">查数模式</Label>
                    <select
                      id="query-mode"
                      className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-theme-sm dark:border-gray-800"
                      value={queryMode}
                      onChange={(e) => setQueryMode(e.target.value as "sql" | "dataset")}
                    >
                      <option value="sql">SQL</option>
                      <option value="dataset">Dataset</option>
                    </select>
                  </div>
                </div>
                {queryMode === "dataset" ? (
                  <ReportMetricDatasetFields
                    datasetId={datasetId}
                    boundConfigId={boundConfigId}
                    onDatasetIdChange={setDatasetId}
                    onBoundConfigIdChange={setBoundConfigId}
                  />
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="change-note">变更说明</Label>
                  <Textarea id="change-note" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  disabled={saveExtension.isPending}
                  onClick={handleSaveExtension}
                >
                  {saveExtension.isPending ? "保存中…" : "保存扩展配置"}
                </Button>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {renderQuery.isLoading ? <Skeleton className="h-48 w-full rounded-xl" /> : null}
            {renderQuery.isError ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                暂无渲染规格，请先在扩展配置中保存指标。
              </p>
            ) : null}
            {renderQuery.data ? (
              <ScrollArea className="max-h-[400px] rounded-xl border border-gray-200 dark:border-gray-800">
                <pre className="p-4 text-theme-xs text-gray-700 dark:text-gray-300">
                  {JSON.stringify(renderQuery.data, null, 2)}
                </pre>
              </ScrollArea>
            ) : null}
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <SchedulePanel catalogNodeId={node.id} readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="batch" className="mt-6">
            <BatchImportPanel readOnly={readOnly} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

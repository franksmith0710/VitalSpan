import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchImportPanel } from "./BatchImportPanel";
import { CatalogNodeMetaPanel } from "./CatalogNodeMetaPanel";
import { ReportExportCard } from "./ReportExportCard";
import { ReportExtensionPreview } from "./ReportExtensionPreview";
import { ReportMetricExtensionForm } from "./ReportMetricExtensionForm";
import { SchedulePanel } from "./SchedulePanel";
import { TemplateBlockEditor } from "./TemplateBlockEditor";
import { type CatalogNode, useCatalogExtension, useExtensionRenderSpec } from "../useReportTemplates";
import type { ReportCatalogNode } from "@/lib/reportCatalogUtils";

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

export function TemplateDetailPanel({
  node,
  allNodes,
  readOnly,
  onDeleted,
}: {
  node: CatalogNode;
  allNodes: ReportCatalogNode[];
  readOnly: boolean;
  onDeleted?: () => void;
}) {
  const [tab, setTab] = useState("basic");
  const tabByNodeRef = useRef<Record<string, string>>({});
  const extQuery = useCatalogExtension(node.id);
  const renderQuery = useExtensionRenderSpec(node.id, tab === "preview");
  const extensionData =
    extQuery.data && String(extQuery.data.catalogNodeId) === String(node.id) ? extQuery.data : null;
  const extensionLoading =
    extQuery.isLoading || (extQuery.isFetching && !extensionData);
  const previewData =
    renderQuery.data && String(renderQuery.data.templateNodeId ?? "") === node.id
      ? renderQuery.data
      : null;

  useEffect(() => {
    const saved = tabByNodeRef.current[node.id];
    if (saved) setTab(saved);
    else setTab("basic");
  }, [node.id]);

  const handleTabChange = (value: string) => {
    tabByNodeRef.current[node.id] = value;
    setTab(value);
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
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-only">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="blocks">模板块</TabsTrigger>
            <TabsTrigger value="extension">扩展配置</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="schedule">调度</TabsTrigger>
            <TabsTrigger value="batch">批量导入</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6 space-y-6">
            <CatalogNodeMetaPanel
              node={node}
              allNodes={allNodes}
              readOnly={readOnly}
              onDeleted={onDeleted}
            />
            <dl className="grid gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
              <BasicInfoRow label="节点类型">报表模板</BasicInfoRow>
              <BasicInfoRow label="模板格式">
                {node.templateKind ? KIND_LABELS[node.templateKind] : "—"}
              </BasicInfoRow>
              <BasicInfoRow label="模板键">{node.templateKey ?? "—"}</BasicInfoRow>
            </dl>
            <ReportExportCard
              defaultTemplateId={node.id}
              disabled={extensionLoading || !extensionData || (extensionData.metrics?.length ?? 0) === 0}
              disabledHint="请先在「扩展配置」Tab 添加指标、选择数据集并保存后再导出。"
            />
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
              <p className="text-theme-sm text-gray-500">请先为模板节点设置模板键。</p>
            )}
          </TabsContent>

          <TabsContent value="extension" className="mt-6">
            <ReportMetricExtensionForm
              nodeId={node.id}
              readOnly={readOnly}
              metrics={extensionData?.metrics ?? []}
              filters={extensionData?.filters ?? []}
              defaultDataSourceId={extensionData?.defaultDataSourceId}
              isLoading={extensionLoading}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {renderQuery.isLoading && !previewData ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : null}
            {renderQuery.isError && !previewData ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                暂无渲染规格。请先在「扩展配置」中添加指标、保存后再预览（当前为指标配置预览，非 Word 文档渲染）。
              </p>
            ) : null}
            {previewData ? <ReportExtensionPreview data={previewData} /> : null}
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

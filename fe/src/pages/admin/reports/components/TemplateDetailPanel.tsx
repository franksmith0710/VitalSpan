import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { mapApiError } from "@/lib/apiError";
import {
  type CatalogNode,
  useCatalogExtension,
  useExtensionRenderSpec,
  useReportTemplates,
} from "../useReportTemplates";

export function TemplateDetailPanel({ node, readOnly }: { node: CatalogNode; readOnly: boolean }) {
  const [tab, setTab] = useState("basic");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricKey, setMetricKey] = useState("");
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
    const nextMetrics =
      metricKey && metricLabel ? [...metrics, { key: metricKey, label: metricLabel, visible: true }] : metrics;
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
          setChangeNote("");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-theme-base">{node.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="extension">扩展配置</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-4 space-y-3 text-theme-sm">
            <p>
              <span className="text-gray-500 dark:text-gray-400">类型：</span>
              {node.nodeType === "template" ? (node.templateKind ?? "模板") : "文件夹"}
            </p>
            {node.templateKey ? (
              <p>
                <span className="text-gray-500 dark:text-gray-400">模板键：</span>
                <code className="font-mono text-theme-xs">{node.templateKey}</code>
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="extension" className="mt-4 space-y-4">
            {extQuery.isLoading ? <Skeleton className="h-20 w-full" /> : null}
            <ul className="space-y-2">
              {metrics.map((m) => (
                <li
                  key={m.key}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-theme-sm dark:border-gray-800"
                >
                  {m.label} <span className="text-gray-500">({m.key})</span>
                </li>
              ))}
            </ul>
            {!readOnly ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="metric-key">指标键</Label>
                    <Input id="metric-key" value={metricKey} onChange={(e) => setMetricKey(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="metric-label">显示名</Label>
                    <Input id="metric-label" value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} />
                  </div>
                </div>
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
              </>
            ) : null}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            {renderQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
            {renderQuery.isError ? (
              <p className="text-theme-sm text-gray-600 dark:text-gray-400">暂无渲染规格，请先配置扩展。</p>
            ) : null}
            {renderQuery.data ? (
              <ScrollArea className="max-h-[360px] rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <pre className="text-theme-xs text-gray-700 dark:text-gray-300">
                  {JSON.stringify(renderQuery.data, null, 2)}
                </pre>
              </ScrollArea>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileJson, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { randomId } from "@/lib/randomId";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { invalidateCatalogQueries } from "@/lib/catalogQueryInvalidation";
import { mapApiError } from "@/lib/apiError";
import { TemplateField, TemplatePanelSection, TemplateTabShell } from "./templatePanelUi";

type BatchItem = {
  name: string;
  parentId?: string | null;
  templateKind?: string | null;
};

type BatchResult = {
  batchId: string;
  createdNodeIds: string[];
  rolledBackCount?: number;
  failures?: Array<{ index: number; code: string; message: string }>;
  idempotentReplay?: boolean;
};

const SAMPLE_JSON = JSON.stringify(
  { items: [{ name: "示例", templateKind: "excel" }] },
  null,
  2,
);

export function BatchImportPanel({ readOnly }: { readOnly: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [result, setResult] = useState<BatchResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (body: { items: BatchItem[] }) =>
      apiFetch<BatchResult>("/api/v1/reports/batch", {
        method: "POST",
        headers: { "Idempotency-Key": randomId() },
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setResult(data);
      invalidateCatalogQueries(qc);
      toast.success(`成功导入 ${data.createdNodeIds.length} 项`);
    },
    onError: (err) => {
      const msg = mapApiError(err);
      toast.error(msg);
    },
  });

  const handleFile = async (file: File | null) => {
    setParseError(null);
    setResult(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { items?: unknown };
      if (!parsed.items || !Array.isArray(parsed.items)) {
        setParseError("JSON 须包含 items 数组");
        setItems([]);
        return;
      }
      setItems(parsed.items as BatchItem[]);
    } catch {
      setParseError("无法解析 JSON 文件，请检查格式");
      setItems([]);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_JSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch-import-sample.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const preview = items.slice(0, 20);

  return (
    <TemplateTabShell>
      <TemplatePanelSection
        title="批量导入报表"
        description="上传符合规范的 JSON 文件，一次性创建多个报表模板节点。"
        icon={Upload}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              className="h-11"
              disabled={readOnly || items.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate({ items })}
            >
              <Upload className="size-4" aria-hidden />
              {importMutation.isPending ? "导入中…" : "开始导入"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={downloadSample}>
              <FileJson className="size-4" aria-hidden />
              下载 JSON 样例
            </Button>
          </div>
        }
      >
        <TemplateField
          id="batch-json-file"
          label="选择 JSON 文件"
          hint="文件须包含 items 数组，每项至少含 name 字段。"
        >
          <Input
            id="batch-json-file"
            ref={fileRef}
            type="file"
            accept=".json"
            className="h-11"
            disabled={readOnly}
            aria-label="选择批量导入 JSON 文件"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </TemplateField>

        {parseError ? (
          <Alert severity="error">
            <AlertTitle>解析失败</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        ) : null}

        {preview.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>行号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>父节点</TableHead>
                  <TableHead>模板类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-mono text-theme-xs">{row.parentId ?? "—"}</TableCell>
                    <TableCell>{row.templateKind ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {items.length > preview.length ? (
              <p className="border-t border-gray-200 px-4 py-2 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                仅展示前 {preview.length} 行，共 {items.length} 行待导入。
              </p>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-2 rounded-xl border border-success-200 bg-success-50/50 p-4 dark:border-success-500/25 dark:bg-success-500/10">
            <p className="text-theme-sm font-medium text-success-700 dark:text-success-400">
              成功创建 {result.createdNodeIds.length} 项
              {result.idempotentReplay ? "（幂等重放）" : ""}
            </p>
            {(result.rolledBackCount ?? 0) > 0 ? (
              <p className="text-theme-sm text-warning-600 dark:text-warning-400">
                已回滚 {result.rolledBackCount} 项
              </p>
            ) : null}
            {result.failures && result.failures.length > 0 ? (
              <div className="rounded-lg border border-warning-500/30 bg-warning-50 p-3 dark:bg-warning-500/10">
                <p className="text-theme-sm font-medium text-warning-700 dark:text-warning-400">部分失败</p>
                <ul className="mt-2 space-y-1 text-theme-xs text-gray-700 dark:text-gray-300">
                  {result.failures.map((f) => (
                    <li key={f.index}>
                      行 {f.index + 1}：{f.code} — {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </TemplatePanelSection>
    </TemplateTabShell>
  );
}

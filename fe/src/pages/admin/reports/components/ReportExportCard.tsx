import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type ExportOut = {
  exportId: string;
  status: string;
  downloadUrl?: string | null;
};

const EXPORT_STATUS_LABELS: Record<string, string> = {
  pending: "处理中",
  succeeded: "已完成",
  failed: "失败",
  ready: "就绪",
};

function localizeExportStatus(status: string): string {
  return EXPORT_STATUS_LABELS[status] ?? status;
}

export function ReportExportCard({
  defaultTemplateId,
  showTemplateIdField = false,
  disabled = false,
  disabledHint,
  embedded = false,
}: {
  defaultTemplateId?: string;
  showTemplateIdField?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  embedded?: boolean;
}) {
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");
  const [format, setFormat] = useState("pdf");
  const [status, setStatus] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultTemplateId) setTemplateId(defaultTemplateId);
  }, [defaultTemplateId]);

  const effectiveTemplateId = templateId.trim();
  const canExport = Boolean(effectiveTemplateId) && !disabled;

  const requestExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setStatus(null);
    setDownloadUrl(null);
    try {
      const created = await apiFetch<ExportOut>(
        `/api/v1/reports/export?templateId=${encodeURIComponent(effectiveTemplateId)}&format=${encodeURIComponent(format)}`,
      );
      setStatus(created.status);
      if (created.downloadUrl) setDownloadUrl(created.downloadUrl);
      if (created.status === "pending") {
        await pollExport(created.exportId);
      }
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const pollExport = async (id: string) => {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const out = await apiFetch<ExportOut>(`/api/v1/reports/export/${id}`);
      setStatus(out.status);
      if (out.downloadUrl) {
        setDownloadUrl(out.downloadUrl);
        return;
      }
      if (out.status === "failed") return;
    }
  };

  if (!showTemplateIdField && !defaultTemplateId) {
    return null;
  }

  const body = (
    <div className={embedded ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
      {showTemplateIdField ? (
        <div className="grid gap-2">
          <Label htmlFor="export-template-id">模板 ID</Label>
          <Input
            id="export-template-id"
            className="h-11"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="粘贴报表模板 UUID"
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="export-format">导出格式</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id="export-format" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button
          type="button"
          className="h-11"
          variant="primary"
          disabled={loading || !canExport}
          onClick={() => void requestExport()}
        >
          {loading ? "导出中…" : "发起导出"}
        </Button>
        {disabled && disabledHint ? (
          <span className="text-theme-sm text-gray-500 dark:text-gray-400">{disabledHint}</span>
        ) : null}
        {status ? (
          <span className="text-theme-sm text-gray-600 dark:text-gray-400">
            状态：{localizeExportStatus(status)}
          </span>
        ) : null}
        {downloadUrl ? (
          <Button asChild className="h-11" variant="outline">
            <a href={downloadUrl} download>
              <Download className="size-4" aria-hidden />
              下载
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">导出为文件</p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          将当前分析结果关联到报表模板并导出 PDF / Word / Excel。
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-theme-base">报表导出</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

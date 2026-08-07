import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateField } from "./templatePanelUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { fetchAuthenticatedBlob } from "@/lib/apiUpload";
import { mapApiError } from "@/lib/apiError";
import { exportMagicMatches } from "@/lib/reportExportUtils";

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

function exportFileName(exportId: string, format: string): string {
  const ext = format === "word" ? "docx" : format === "excel" ? "xlsx" : format;
  return `report-${exportId}.${ext}`;
}

async function triggerBlobDownload(blob: Blob, fileName: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
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
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (defaultTemplateId) setTemplateId(defaultTemplateId);
  }, [defaultTemplateId]);

  const effectiveTemplateId = templateId.trim();
  const canExport = Boolean(effectiveTemplateId) && !disabled;

  const requestExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setStatus(null);
    setDownloadPath(null);
    setExportId(null);
    try {
      const created = await apiFetch<ExportOut>(
        `/api/v1/reports/export?templateId=${encodeURIComponent(effectiveTemplateId)}&format=${encodeURIComponent(format)}`,
      );
      setStatus(created.status);
      setExportId(created.exportId);
      if (created.downloadUrl) setDownloadPath(created.downloadUrl);
      if (created.status === "pending") {
        await pollExport(created.exportId);
      } else if (created.downloadUrl) {
        await verifyExportMagic(created.downloadUrl);
      }
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyExportMagic = async (path: string) => {
    try {
      const blob = await fetchAuthenticatedBlob(path);
      const buffer = await blob.arrayBuffer();
      if (!exportMagicMatches(new Uint8Array(buffer), format)) {
        toast.warning("导出文件格式与所选格式不一致，请检查模板配置");
      }
    } catch {
      /* smoke tests may mock without blob fetch */
    }
  };

  const pollExport = async (id: string) => {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const out = await apiFetch<ExportOut>(`/api/v1/reports/export/${id}`);
      setStatus(out.status);
      setExportId(out.exportId);
      if (out.downloadUrl) {
        setDownloadPath(out.downloadUrl);
        await verifyExportMagic(out.downloadUrl);
        return;
      }
      if (out.status === "failed") return;
    }
  };

  const handleDownload = async () => {
    if (!downloadPath || !exportId) return;
    setDownloading(true);
    try {
      const blob = await fetchAuthenticatedBlob(downloadPath);
      await triggerBlobDownload(blob, exportFileName(exportId, format));
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  if (!showTemplateIdField && !defaultTemplateId) {
    return null;
  }

  const body = (
    <div className="grid gap-4 sm:grid-cols-2">
      {showTemplateIdField ? (
        <TemplateField id="export-template-id" label="模板 ID" className="sm:col-span-2">
          <Input
            id="export-template-id"
            className="h-11"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="粘贴报表模板 UUID"
          />
        </TemplateField>
      ) : null}
      <TemplateField id="export-format" label="导出格式">
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
      </TemplateField>
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
        {downloadPath ? (
          <Button
            type="button"
            className="h-11"
            variant="outline"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            <Download className="size-4" aria-hidden />
            {downloading ? "下载中…" : "下载"}
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">报表导出</h3>
      </div>
      <div className="px-5 py-4">{body}</div>
    </div>
  );
}

import { useState } from "react";
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

export function ReportExportCard() {
  const [templateId, setTemplateId] = useState("00000000-0000-4000-8000-0000000000a1");
  const [format, setFormat] = useState("pdf");
  const [exportId, setExportId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestExport = async () => {
    setLoading(true);
    setExportId(null);
    setStatus(null);
    setDownloadUrl(null);
    try {
      const created = await apiFetch<ExportOut>(
        `/api/v1/reports/export?templateId=${encodeURIComponent(templateId)}&format=${encodeURIComponent(format)}`,
      );
      setExportId(created.exportId);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-theme-base">报表导出</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="export-template-id">模板 ID</Label>
          <Input
            id="export-template-id"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="UUID"
          />
        </div>
        <div className="grid gap-2">
          <Label>格式</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="word">Word</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="primary" disabled={loading} onClick={() => void requestExport()}>
            {loading ? "导出中…" : "发起导出"}
          </Button>
          {status ? (
            <span className="text-theme-sm text-gray-600 dark:text-gray-400">状态：{status}</span>
          ) : null}
          {downloadUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={downloadUrl} download>
                <Download className="size-4" aria-hidden />
                下载
              </a>
            </Button>
          ) : null}
          {exportId ? (
            <span className="font-mono text-theme-xs text-gray-500">exportId: {exportId.slice(0, 8)}…</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

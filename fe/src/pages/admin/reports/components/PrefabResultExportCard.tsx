import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TemplateField } from "./templatePanelUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAuthenticatedBlob } from "@/lib/apiUpload";
import { mapApiError } from "@/lib/apiError";

function exportFileName(bindingKey: string, format: string): string {
  const ext = format === "word" ? "docx" : format === "excel" ? "xlsx" : format;
  return `prefab-${bindingKey}.${ext}`;
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

export function PrefabResultExportCard({
  bindingKey,
  disabled = false,
}: {
  bindingKey: string;
  disabled?: boolean;
}) {
  const [format, setFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const path = `/api/v1/reports/prefab/bindings/${encodeURIComponent(bindingKey)}/export?format=${encodeURIComponent(format)}`;
      const blob = await fetchAuthenticatedBlob(path);
      await triggerBlobDownload(blob, exportFileName(bindingKey, format));
      toast.success("导出完成");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TemplateField id="prefab-export-format" label="导出格式">
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id="prefab-export-format" className="h-11">
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
          disabled={disabled || loading}
          onClick={() => void handleExport()}
        >
          <Download className="size-4" aria-hidden />
          {loading ? "导出中…" : "导出当前结果"}
        </Button>
        {disabled ? (
          <span className="text-theme-sm text-gray-500 dark:text-gray-400">请先运行分析后再导出</span>
        ) : (
          <span className="text-theme-sm text-gray-500 dark:text-gray-400">
            将当前预制分析结果导出为文件
          </span>
        )}
      </div>
    </div>
  );
}

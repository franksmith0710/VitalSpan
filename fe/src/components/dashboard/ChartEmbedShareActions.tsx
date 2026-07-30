import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type ChartEmbedShareActionsProps = {
  chartId: string;
  /** public：浏览器直开；embed：iframe 嵌入（当前 origin 白名单） */
  mode?: "public" | "embed";
  theme?: "light" | "dark";
};

export function ChartEmbedShareActions({
  chartId,
  mode = "public",
  theme = "light",
}: ChartEmbedShareActionsProps) {
  const [issuing, setIssuing] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("已复制链接");
  };

  const issueLink = async () => {
    setIssuing(true);
    try {
      const tokenResp = await apiFetch<{ embedUrl: string }>("/api/v1/embed/token", {
        method: "POST",
        body: JSON.stringify(
          mode === "public"
            ? { chartId, shareMode: "public", theme }
            : {
                chartId,
                allowedOrigins: [window.location.origin],
                theme,
              },
        ),
      });
      setEmbedUrl(`${window.location.origin}${tokenResp.embedUrl}`);
      toast.success(mode === "public" ? "公开链接已生成" : "嵌入链接已生成");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setIssuing(false);
    }
  };

  if (!embedUrl) {
    return (
      <Button type="button" size="sm" variant="primary" disabled={issuing} onClick={() => void issueLink()}>
        {issuing ? "签发中…" : mode === "public" ? "生成公开链接" : "签发嵌入链接"}
      </Button>
    );
  }

  return (
    <div className="flex max-w-xl flex-col items-end gap-2 text-right">
      <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">{embedUrl}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => copyUrl(embedUrl)}>
          <Copy className="size-4" aria-hidden />
          复制链接
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={embedUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" aria-hidden />
            预览
          </a>
        </Button>
      </div>
    </div>
  );
}

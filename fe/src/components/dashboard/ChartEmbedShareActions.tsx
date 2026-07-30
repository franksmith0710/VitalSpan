import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { ShareIssuedUrlPanel } from "@/components/dashboard/ShareIssuedUrlPanel";

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

  return <ShareIssuedUrlPanel url={embedUrl} />;
}

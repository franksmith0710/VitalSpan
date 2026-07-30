import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type PublicShareLinkCardProps = {
  dashboardId: string;
  name: string;
  theme?: "light" | "dark";
};

export function PublicShareLinkCard({
  dashboardId,
  name,
  theme = "light",
}: PublicShareLinkCardProps) {
  const [issuing, setIssuing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("已复制链接");
  };

  const issuePublicLink = async () => {
    setIssuing(true);
    try {
      const tokenResp = await apiFetch<{ embedUrl: string }>("/api/v1/embed/token", {
        method: "POST",
        body: JSON.stringify({
          dashboardId,
          shareMode: "public",
          theme,
        }),
      });
      setPublicUrl(`${window.location.origin}${tokenResp.embedUrl}`);
      toast.success("公开链接已生成");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
      <CardHeader className="border-b border-gray-200 dark:border-gray-800">
        <CardTitle className="text-theme-base">公开链接</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          生成带过期时间的只读链接，持有链接者无需登录即可在浏览器中查看「{name}」。链接路径为
          /embed/screen/…（整板只读预览；v1 看板以网格布局展示）。
        </p>
        <p className="text-theme-xs text-amber-600 dark:text-amber-400">
          请仅在受控范围内分享；链接到期后自动失效。
        </p>
        {publicUrl ? (
          <>
            <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">
              {publicUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => copyUrl(publicUrl)}>
                <Copy className="size-4" aria-hidden />
                复制链接
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" aria-hidden />
                  预览
                </a>
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={issuing}
            onClick={() => void issuePublicLink()}
          >
            {issuing ? "签发中…" : "生成公开链接"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

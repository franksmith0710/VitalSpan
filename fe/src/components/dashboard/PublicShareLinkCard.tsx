import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import {
  SHARE_SECTION_CARD_CLASS,
  SHARE_SECTION_CARD_HEADER_CLASS,
} from "@/components/dashboard/sharePageUi";
import { ShareSectionActionRow } from "@/components/dashboard/shareSectionActionRow";

type PublicShareLinkCardProps = {
  dashboardId: string;
  name: string;
  theme?: "light" | "dark";
  density?: "default" | "compact";
  className?: string;
};

export function PublicShareLinkCard({
  dashboardId,
  name,
  theme = "light",
  density = "default",
  className,
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

  const actions = publicUrl ? (
    <div className="flex max-w-xl flex-col items-end gap-2 text-right">
      <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">{publicUrl}</p>
      <div className="flex flex-wrap justify-end gap-2">
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
    </div>
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
  );

  return (
    <Card className={cn(SHARE_SECTION_CARD_CLASS, className)}>
      <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
        <CardTitle className="text-theme-base">公开链接</CardTitle>
      </CardHeader>
      <CardContent className={density === "compact" ? "pt-4" : "pt-6"}>
        <ShareSectionActionRow
          description={
            density === "compact" ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                只读外链，持有链接者无需登录即可查看「{name}」。
                <span className="text-theme-xs text-amber-600 dark:text-amber-400">
                  {" "}
                  请仅在受控范围分享；链接到期后自动失效。
                </span>
              </p>
            ) : (
              <>
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  生成带过期时间的只读链接，持有链接者无需登录即可在浏览器中查看「{name}」。链接路径为
                  /embed/screen/…（整板只读预览；v1 看板以网格布局展示）。
                </p>
                <p className="text-theme-xs text-amber-600 dark:text-amber-400">
                  请仅在受控范围内分享；链接到期后自动失效。
                </p>
              </>
            )
          }
          actions={actions}
        />
      </CardContent>
    </Card>
  );
}

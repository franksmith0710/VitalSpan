import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { ShareIssuedUrlPanel } from "@/components/dashboard/ShareIssuedUrlPanel";
import {
  SHARE_SECTION_CARD_CLASS,
  SHARE_SECTION_CARD_HEADER_CLASS,
} from "@/components/dashboard/sharePageUi";

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

  const description =
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
    );

  return (
    <Card className={cn(SHARE_SECTION_CARD_CLASS, className)}>
      <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
        <CardTitle className="text-theme-base">公开链接</CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-3", density === "compact" ? "pt-4" : "pt-6")}>
        {description}
        {publicUrl ? (
          <ShareIssuedUrlPanel url={publicUrl} />
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

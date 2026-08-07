import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchAuthenticatedBlob } from "@/lib/apiUpload";

type HubCardDashboardThumbnailProps = {
  thumbnailUrl: string;
  isDataScreen?: boolean;
  className?: string;
};

/**
 * 列表 Hub 卡片静态缩略图：经 Bearer 拉取后端 PNG/WebP，避免裸链 401。
 */
export function HubCardDashboardThumbnail({
  thumbnailUrl,
  isDataScreen = false,
  className,
}: HubCardDashboardThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setFailed(false);

    void fetchAuthenticatedBlob(thumbnailUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [thumbnailUrl]);

  if (failed) {
    return null;
  }

  if (!src) {
    return (
      <Skeleton
        className={cn("h-full w-full rounded-none", className)}
        data-testid="hub-card-dashboard-thumbnail-loading"
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "h-full w-full object-cover object-top",
        isDataScreen ? "bg-slate-950" : "bg-white dark:bg-gray-900/60",
        className,
      )}
      data-testid="hub-card-dashboard-thumbnail"
      decoding="async"
    />
  );
}

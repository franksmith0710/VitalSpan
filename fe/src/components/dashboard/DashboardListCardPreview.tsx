import { cn } from "@/lib/utils";
import { useAuthenticatedBlobUrl } from "@/hooks/useAuthenticatedBlobUrl";
import { isDataScreenLayout } from "@/lib/dataScreenLayout";
import { DashboardPreviewThumb } from "./DashboardPreviewThumb";
import type { DashboardLayout } from "./layoutUtils";

type DashboardListCardPreviewProps = {
  layoutJson?: DashboardLayout;
  thumbnailUrl?: string | null;
  className?: string;
};

/**
 * 列表卡片预览：优先展示保存时截取的真实渲染缩略图，无图时回退静态示意。
 */
export function DashboardListCardPreview({
  layoutJson,
  thumbnailUrl,
  className,
}: DashboardListCardPreviewProps) {
  const isScreen = isDataScreenLayout(layoutJson);
  const screenshotSrc = useAuthenticatedBlobUrl(thumbnailUrl);

  return (
    <div
      className={cn(
        "dashboard-list-card-preview relative h-full overflow-hidden",
        "transition-[filter,transform] duration-300 group-hover:scale-[1.02] group-hover:blur-[2px]",
        className,
      )}
      data-testid="dashboard-list-card-preview"
      aria-hidden
    >
      {screenshotSrc ? (
        <img
          src={screenshotSrc}
          alt=""
          draggable={false}
          className="h-full w-full object-cover object-top"
          data-testid="dashboard-list-card-screenshot"
        />
      ) : (
        <DashboardPreviewThumb
          layoutJson={layoutJson}
          embedded
          isDataScreen={isScreen}
          className="h-full"
        />
      )}
    </div>
  );
}

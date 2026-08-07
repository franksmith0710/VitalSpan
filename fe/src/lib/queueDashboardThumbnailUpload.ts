import type { QueryClient } from "@tanstack/react-query";
import { uploadDashboardThumbnail } from "@/lib/uploadDashboardThumbnail";
import { queryKeys } from "@/lib/queryKeys";

/** 保存成功后异步上传列表缩略图；失败静默，不阻塞编辑流程 */
export function queueDashboardThumbnailUpload(
  dashboardId: string,
  queryClient: QueryClient,
): void {
  void uploadDashboardThumbnail(dashboardId)
    .then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
    })
    .catch((err) => {
      console.warn("[dashboard-thumbnail] upload skipped or failed", err);
    });
}

import { uploadDashboardThumbnail } from "./uploadDashboardThumbnail";

/** 保存成功后异步上传封面，失败不阻断保存流程 */
export function scheduleDashboardThumbnailUpload(dashboardId: string): void {
  void uploadDashboardThumbnail(dashboardId).catch((err) => {
    console.warn("[dashboard-save] thumbnail upload failed", err);
  });
}

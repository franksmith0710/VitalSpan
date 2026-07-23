import { apiUploadBlob } from "@/lib/apiUpload";
import {
  captureDashboardThumbnailBlob,
  findDashboardThumbnailCaptureRoot,
} from "@/lib/captureDashboardThumbnail";

export async function uploadDashboardThumbnail(dashboardId: string): Promise<void> {
  const root = findDashboardThumbnailCaptureRoot();
  if (!root) {
    throw new Error("未找到可截图的画布区域");
  }
  const blob = await captureDashboardThumbnailBlob(root);
  const contentType = blob.type || "image/png";
  await apiUploadBlob(`/api/v1/dashboards/${dashboardId}/thumbnail`, blob, contentType);
}

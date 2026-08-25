import { apiUploadBlob } from "@/lib/apiUpload";
import {
  assertUsableImageBlob,
  captureDashboardThumbnailBlob,
  findVizComponentThumbnailCaptureRoot,
} from "@/lib/captureDashboardThumbnail";

export async function persistVizComponentThumbnail(componentId: string): Promise<void> {
  const root = findVizComponentThumbnailCaptureRoot();
  if (!root) {
    throw new Error("未找到可截图的组件预览区域");
  }
  const blob = await captureDashboardThumbnailBlob(root);
  assertUsableImageBlob(blob);
  const contentType = (blob.type || "image/png").split(";")[0]?.trim() || "image/png";
  await apiUploadBlob(`/api/v1/viz-components/${componentId}/thumbnail`, blob, contentType);
}

/** 封面失败不阻断保存；须在离开编辑页之前 await */
export async function persistVizComponentThumbnailBestEffort(componentId: string): Promise<boolean> {
  try {
    await persistVizComponentThumbnail(componentId);
    return true;
  } catch (err) {
    console.warn("[viz-component-save] thumbnail upload failed", err);
    return false;
  }
}

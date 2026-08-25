import { apiUploadBlob } from "@/lib/apiUpload";
import {
  assertUsableImageBlob,
  captureDashboardThumbnailBlob,
  findDashboardWidgetCaptureRoot,
  findVizComponentThumbnailCaptureRoot,
} from "@/lib/captureDashboardThumbnail";

async function uploadCapturedThumbnail(componentId: string, root: HTMLElement): Promise<void> {
  const blob = await captureDashboardThumbnailBlob(root);
  assertUsableImageBlob(blob);
  const contentType = (blob.type || "image/png").split(";")[0]?.trim() || "image/png";
  await apiUploadBlob(`/api/v1/viz-components/${componentId}/thumbnail`, blob, contentType);
}

export async function persistVizComponentThumbnail(componentId: string): Promise<void> {
  const root = findVizComponentThumbnailCaptureRoot();
  if (!root) {
    throw new Error("未找到可截图的组件预览区域");
  }
  await uploadCapturedThumbnail(componentId, root);
}

export async function persistVizComponentThumbnailFromWidget(
  componentId: string,
  widgetId: string,
): Promise<void> {
  const root = findDashboardWidgetCaptureRoot(widgetId);
  if (!root) {
    throw new Error("未找到可截图的画布组件");
  }
  await uploadCapturedThumbnail(componentId, root);
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

/** 看板发布到组件库：从画布 widget 截取封面，失败不阻断发布 */
export async function persistVizComponentThumbnailFromWidgetBestEffort(
  componentId: string,
  widgetId: string,
): Promise<boolean> {
  try {
    await persistVizComponentThumbnailFromWidget(componentId, widgetId);
    return true;
  } catch (err) {
    console.warn("[viz-component-publish] thumbnail upload failed", err);
    return false;
  }
}

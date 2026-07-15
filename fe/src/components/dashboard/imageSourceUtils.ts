export const IMAGE_SOURCE_ACCEPT = "image/jpeg,image/png,image/gif,image/svg+xml,image/webp";
export const MAX_IMAGE_SOURCE_BYTES = 2 * 1024 * 1024;

export function isHttpImageUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

export function isDataImageUrl(value: string): boolean {
  return value.trim().startsWith("data:image/");
}

export function isImageSourceValue(value: string): boolean {
  const trimmed = value.trim();
  return isHttpImageUrl(trimmed) || isDataImageUrl(trimmed);
}

export async function readImageFileAsDataUrl(
  file: File,
  maxBytes = MAX_IMAGE_SOURCE_BYTES,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件（JPG、PNG、GIF、SVG、WebP）");
  }
  if (file.size > maxBytes) {
    throw new Error(`图片不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

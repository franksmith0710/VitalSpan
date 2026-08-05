import { fetchWithTimeout, getAuthHeaders } from "@/lib/api";
import { resolveApiBaseUrl } from "@/lib/appBasePath";

const API_BASE = resolveApiBaseUrl();

export async function apiUploadBlob(
  path: string,
  blob: Blob,
  contentType: string,
  method = "PUT",
): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method,
    body: blob,
    headers: {
      "Content-Type": contentType,
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch blob failed (${response.status})`);
  }
  return response.blob();
}

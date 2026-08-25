import { afterEach, describe, expect, it, vi } from "vitest";
import { persistVizComponentThumbnail, persistVizComponentThumbnailBestEffort } from "./uploadVizComponentThumbnail";

vi.mock("@/lib/apiUpload", () => ({
  apiUploadBlob: vi.fn(async () => undefined),
}));

vi.mock("@/lib/captureDashboardThumbnail", () => ({
  assertUsableImageBlob: (blob: Blob) => {
    if (!blob || blob.size < 256) throw new Error("截图生成为空");
  },
  captureDashboardThumbnailBlob: vi.fn(),
  findVizComponentThumbnailCaptureRoot: vi.fn(),
}));

import { apiUploadBlob } from "@/lib/apiUpload";
import {
  captureDashboardThumbnailBlob,
  findVizComponentThumbnailCaptureRoot,
} from "@/lib/captureDashboardThumbnail";

describe("persistVizComponentThumbnail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("captures then uploads png", async () => {
    const blob = new Blob([new Uint8Array(512)], { type: "image/png" });
    vi.mocked(findVizComponentThumbnailCaptureRoot).mockReturnValue(document.createElement("div"));
    vi.mocked(captureDashboardThumbnailBlob).mockResolvedValue(blob);

    await persistVizComponentThumbnail("comp-1");

    expect(apiUploadBlob).toHaveBeenCalledWith(
      "/api/v1/viz-components/comp-1/thumbnail",
      blob,
      "image/png",
    );
  });

  it("throws when preview root is missing", async () => {
    vi.mocked(findVizComponentThumbnailCaptureRoot).mockReturnValue(null);
    await expect(persistVizComponentThumbnail("comp-1")).rejects.toThrow(/未找到/);
    expect(apiUploadBlob).not.toHaveBeenCalled();
  });

  it("best effort returns false instead of throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(findVizComponentThumbnailCaptureRoot).mockReturnValue(null);
    await expect(persistVizComponentThumbnailBestEffort("comp-1")).resolves.toBe(false);
    warn.mockRestore();
  });
});

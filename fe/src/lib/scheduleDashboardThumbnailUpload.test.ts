import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleDashboardThumbnailUpload } from "./scheduleDashboardThumbnailUpload";

vi.mock("./uploadDashboardThumbnail", () => ({
  uploadDashboardThumbnail: vi.fn(async () => undefined),
}));

import { uploadDashboardThumbnail } from "./uploadDashboardThumbnail";

describe("scheduleDashboardThumbnailUpload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls uploadDashboardThumbnail without blocking", async () => {
    scheduleDashboardThumbnailUpload("dash-1");
    await vi.waitFor(() => {
      expect(uploadDashboardThumbnail).toHaveBeenCalledWith("dash-1");
    });
  });

  it("swallows upload failures", async () => {
    vi.mocked(uploadDashboardThumbnail).mockRejectedValueOnce(new Error("capture failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    scheduleDashboardThumbnailUpload("dash-2");
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled();
    });

    warn.mockRestore();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destroy, init } from "./embedSdk";

describe("embedSdk", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          containerId: "host-1",
          apiBase: "/api/v1",
          token: "tok-abc",
          theme: "light",
        }),
      }),
    );
  });
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("T-VIZ-R237-007-01: init creates iframe after sdk-params 200", async () => {
    const host = document.createElement("div");
    host.id = "embed-host";
    document.body.appendChild(host);
    const handle = await init({
      container: "#embed-host",
      token: "tok-abc",
      targetType: "chart",
      targetId: "chart-1",
    });
    expect(handle.iframe.tagName).toBe("IFRAME");
    expect(handle.iframe.src).toContain("token=tok-abc");
    expect(handle.iframe.src).toContain("/embed/chart/chart-1");
    destroy(handle);
  });

  it("T-VIZ-R237-007-02: missing container calls onError", async () => {
    const onError = vi.fn();
    await expect(
      init({
        container: "#missing",
        token: "t",
        targetType: "chart",
        targetId: "x",
        onError,
      }),
    ).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith("容器未找到");
  });

  it("T-VIZ-R237-007-03: destroy clears container", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = await init({
      container: host,
      token: "tok",
      targetType: "chart",
      targetId: "c1",
    });
    destroy(handle);
    expect(host.innerHTML).toBe("");
  });
});

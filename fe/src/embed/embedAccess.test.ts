import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmbedPageAuthorized, resolveEmbedAllowedOrigins } from "./embedAccess";

describe("embedAccess", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows public share without origin whitelist", () => {
    const params = new URLSearchParams("token=abc&shareMode=public");
    expect(isEmbedPageAuthorized(params, "http://localhost:5174", true)).toBe(true);
  });

  it("allows top-level direct open when token is present", () => {
    vi.stubGlobal("window", {
      ...window,
      self: window,
      top: window,
      location: { ...window.location, origin: "http://localhost:5174" },
    });
    const params = new URLSearchParams("token=abc");
    expect(isEmbedPageAuthorized(params, "http://localhost:5174", true)).toBe(true);
  });

  it("defaults allowed origins to current origin", () => {
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:5174" });
    expect(resolveEmbedAllowedOrigins(new URLSearchParams())).toEqual(["http://localhost:5174"]);
  });
});

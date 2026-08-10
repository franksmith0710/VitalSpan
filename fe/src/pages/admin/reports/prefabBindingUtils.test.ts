import { describe, expect, it } from "vitest";
import { suggestPrefabBindingKey } from "./prefabBindingUtils";

describe("suggestPrefabBindingKey", () => {
  it("returns unique prefab- prefixed keys", () => {
    const a = suggestPrefabBindingKey();
    const b = suggestPrefabBindingKey();
    expect(a).toMatch(/^prefab-[a-z0-9]+$/);
    expect(b).toMatch(/^prefab-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});

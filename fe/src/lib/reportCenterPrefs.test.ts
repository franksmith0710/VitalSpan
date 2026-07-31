import { describe, expect, it } from "vitest";
import { readPinnedPrefabKeys, sortPrefabsByPin, togglePinnedPrefabKey } from "./reportCenterPrefs";

describe("reportCenterPrefs", () => {
  it("toggles pinned prefab keys", () => {
    localStorage.clear();
    expect(togglePinnedPrefabKey("k1")).toEqual(["k1"]);
    expect(togglePinnedPrefabKey("k1")).toEqual([]);
  });

  it("sorts pinned prefabs first", () => {
    const items = [
      { bindingKey: "a", displayName: "A" },
      { bindingKey: "b", displayName: "B" },
    ];
    expect(sortPrefabsByPin(items, ["b"]).map((item) => item.bindingKey)).toEqual(["b", "a"]);
  });

  it("reads persisted pins", () => {
    localStorage.setItem("vitalspan.reportCenter.pinnedPrefabs", JSON.stringify(["x"]));
    expect(readPinnedPrefabKeys()).toEqual(["x"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  isLayoutInventoryArtifact,
  localizeArtifactKind,
  LAYOUT_INVENTORY_NOTICE,
} from "./scheduleArtifactMeta";

describe("scheduleArtifactMeta", () => {
  it("localizes layout inventory kind", () => {
    expect(localizeArtifactKind("layout_inventory")).toBe("布局摘要");
    expect(isLayoutInventoryArtifact("layout_inventory")).toBe(true);
  });

  it("exposes layout inventory notice copy", () => {
    expect(LAYOUT_INVENTORY_NOTICE).toMatch(/布局摘要/);
  });
});

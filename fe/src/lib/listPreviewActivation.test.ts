import { afterEach, describe, expect, it } from "vitest";
import {
  getActiveListPreviewCountForTests,
  releaseListPreviewSlot,
  requestListPreviewSlot,
  resetListPreviewActivationForTests,
  MAX_LIST_PREVIEW_ACTIVATIONS,
} from "./listPreviewActivation";

describe("listPreviewActivation", () => {
  afterEach(() => {
    resetListPreviewActivationForTests();
  });

  it("grants one slot at a time by default", async () => {
    await requestListPreviewSlot();
    expect(getActiveListPreviewCountForTests()).toBe(MAX_LIST_PREVIEW_ACTIVATIONS);
  });

  it("queues additional requests until a slot is released", async () => {
    await requestListPreviewSlot();
    const pending = requestListPreviewSlot();
    let resolved = false;
    void pending.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    releaseListPreviewSlot();
    await pending;
    expect(resolved).toBe(true);
  });
});

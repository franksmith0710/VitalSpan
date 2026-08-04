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

  it("grants slots up to the concurrent limit", async () => {
    const slots = Array.from({ length: MAX_LIST_PREVIEW_ACTIVATIONS }, () =>
      requestListPreviewSlot(),
    );
    await Promise.all(slots);
    expect(getActiveListPreviewCountForTests()).toBe(MAX_LIST_PREVIEW_ACTIVATIONS);
  });

  it("queues additional requests until a slot is released", async () => {
    const slots = Array.from({ length: MAX_LIST_PREVIEW_ACTIVATIONS }, () =>
      requestListPreviewSlot(),
    );
    await Promise.all(slots);
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

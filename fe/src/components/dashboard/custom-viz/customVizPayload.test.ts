import { describe, expect, it } from "vitest";
import {
  CUSTOM_VIZ_PAYLOAD_CLASS,
  injectCustomVizPayload,
} from "@/components/dashboard/custom-viz/customVizPayload";

describe("injectCustomVizPayload", () => {
  it("writes JSON payload node and style CSS variables on host", () => {
    const host = document.createElement("div");
    injectCustomVizPayload(host, {
      columns: ["region", "amount"],
      rows: [
        ["华东", 100],
        ["华北", 80],
      ],
      style: { accentColor: "#336699", barHeight: 24 },
    });

    const node = host.querySelector(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`);
    expect(node).not.toBeNull();
    expect(node?.textContent).toBe(
      JSON.stringify({
        columns: ["region", "amount"],
        rows: [
          ["华东", 100],
          ["华北", 80],
        ],
        style: { accentColor: "#336699", barHeight: 24 },
      }),
    );
    expect(host.style.getPropertyValue("--vs-style-accent-color")).toBe("#336699");
    expect(host.style.getPropertyValue("--vs-style-bar-height")).toBe("24");
  });

  it("updates existing payload node in place", () => {
    const host = document.createElement("div");
    injectCustomVizPayload(host, { columns: ["a"], rows: [[1]], style: {} });
    injectCustomVizPayload(host, { columns: ["b"], rows: [[2]], style: { foo: "bar" } });
    expect(host.querySelectorAll(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`)).toHaveLength(1);
    expect(JSON.parse(host.querySelector(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`)!.textContent!)).toEqual({
      columns: ["b"],
      rows: [[2]],
      style: { foo: "bar" },
    });
  });

  it("skips redundant inject with identical payload", () => {
    const host = document.createElement("div");
    let events = 0;
    host.addEventListener("vs-cv-payload-update", () => {
      events += 1;
    });
    const payload = { columns: ["a"], rows: [[1]], style: { accentColor: "#111" } };
    injectCustomVizPayload(host, payload);
    injectCustomVizPayload(host, payload);
    expect(events).toBe(1);
    expect(host.querySelectorAll(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`)).toHaveLength(1);
  });

  it("dispatches vs-cv-payload-update for bundle listeners", () => {
    const host = document.createElement("div");
    let detail: unknown;
    host.addEventListener("vs-cv-payload-update", (e) => {
      detail = (e as CustomEvent).detail;
    });
    const payload = { columns: ["x"], rows: [[9]], style: {} };
    injectCustomVizPayload(host, payload);
    expect(detail).toEqual(payload);
  });
});

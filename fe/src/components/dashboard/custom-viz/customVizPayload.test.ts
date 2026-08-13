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
});

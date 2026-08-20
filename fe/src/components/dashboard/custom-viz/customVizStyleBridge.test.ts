import { describe, expect, it } from "vitest";
import { mountCustomVizHtml } from "../customVizHost";
import { CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION, injectCustomVizPayload } from "./customVizPayload";
import { appendCustomVizStyleBridge, applyCustomVizStyleBridgeDom } from "./customVizStyleBridge";

describe("customVizStyleBridge", () => {
  it("injects bridge stylesheet and maps accentColor to host CSS var", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    document.body.appendChild(host);

    const html = `<!DOCTYPE html><html><head><style>.fill{width:40px;height:12px;background:#000000}</style></head><body><div class="fill"></div></body></html>`;
    mountCustomVizHtml(host, html);
    expect(host.querySelector(".vs-cv-style-bridge")).toBeTruthy();

    injectCustomVizPayload(host, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: [],
      rows: [],
      style: { accentColor: "#ff0000" },
    });
    expect(host.style.getPropertyValue("--vs-style-accent-color")).toBe("#ff0000");
    host.remove();
  });

  it("hides badges when showRankBadge is false", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    host.innerHTML = '<div class="badge">1</div><div class="badge">2</div>';
    document.body.appendChild(host);
    appendCustomVizStyleBridge(host);

    applyCustomVizStyleBridgeDom(host, { showRankBadge: false });
    expect(host.getAttribute("data-vs-show-rank-badge")).toBe("false");
    host.querySelectorAll(".badge").forEach((node) => {
      expect((node as HTMLElement).style.display).toBe("none");
    });
    host.remove();
  });

  it("re-applies accentColor without changing rows", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    document.body.appendChild(host);
    const base = {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound" as const,
      columns: ["x"],
      rows: [[1]],
      style: { accentColor: "#111111" },
    };
    injectCustomVizPayload(host, base);
    injectCustomVizPayload(host, { ...base, style: { accentColor: "#222222" } });
    expect(host.style.getPropertyValue("--vs-style-accent-color")).toBe("#222222");
    host.remove();
  });

  it("appends manifest hook stylesheet when provided", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    document.body.appendChild(host);
    appendCustomVizStyleBridge(host, {
      accentColor: { selectors: [".custom-bar"] },
    });
    expect(host.querySelector(".vs-cv-style-hooks")?.textContent).toContain(".custom-bar");
    host.remove();
  });
});

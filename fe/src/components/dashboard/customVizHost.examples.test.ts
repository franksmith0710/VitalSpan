import { afterEach, describe, expect, it } from "vitest";
import alertFeed from "../../../../docs/api/vs-ai-spec/examples/custom-viz-alert-feed.json";
import htmlBundle from "../../../../docs/api/vs-ai-spec/examples/custom-viz-bundle.json";
import d3Bundle from "../../../../docs/api/vs-ai-spec/examples/custom-viz-d3-bundle.json";
import pulseKpi from "../../../../docs/api/vs-ai-spec/examples/custom-viz-pulse-kpi.json";
import ringProgress from "../../../../docs/api/vs-ai-spec/examples/custom-viz-ring-progress.json";
import { mountCustomVizHtml } from "./customVizHost";
import {
  CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
  injectCustomVizPayload,
} from "./custom-viz/customVizPayload";

const UNBOUND_HINT = "请在右侧绑定数据集与字段";

type ExampleBundle = { files: { "index.html": string } };

const HTML_EXAMPLES: Array<{ name: string; bundle: ExampleBundle; root: string }> = [
  { name: "bundle", bundle: htmlBundle as ExampleBundle, root: "#vs-cv-root" },
  { name: "pulse-kpi", bundle: pulseKpi as ExampleBundle, root: "#vs-cv-kpi" },
  { name: "ring-progress", bundle: ringProgress as ExampleBundle, root: "#vs-cv-rings" },
  { name: "alert-feed", bundle: alertFeed as ExampleBundle, root: "#vs-cv-track" },
  { name: "d3-bundle", bundle: d3Bundle as ExampleBundle, root: "#vs-cv-chart" },
];

const hosts: HTMLElement[] = [];

function mountExample(html: string): HTMLElement {
  const host = document.createElement("div");
  host.className = "vs-custom-viz-host";
  document.body.appendChild(host);
  hosts.push(host);
  mountCustomVizHtml(host, html);
  return host;
}

afterEach(() => {
  while (hosts.length) {
    hosts.pop()?.remove();
  }
});

describe("official customViz examples", () => {
  it.each(HTML_EXAMPLES)("shows unbound hint for $name", ({ bundle, root }) => {
    const host = mountExample(bundle.files["index.html"]);
    expect(host.querySelector(root)?.textContent).toContain(UNBOUND_HINT);
  });

  it("two hosts with the same official html do not steal each other's root", () => {
    const html = (htmlBundle as ExampleBundle).files["index.html"];
    const a = mountExample(html);
    const b = mountExample(html);
    const rootA = a.querySelector("#vs-cv-root");
    const rootB = b.querySelector("#vs-cv-root");
    expect(rootA).toBeTruthy();
    expect(rootB).toBeTruthy();
    expect(rootA).not.toBe(rootB);
    if (rootA) rootA.textContent = "HOST_A_MARK";
    expect(b.querySelector("#vs-cv-root")?.textContent).toContain(UNBOUND_HINT);
    expect(a.querySelector("#vs-cv-root")?.textContent).toBe("HOST_A_MARK");
  });

  it("draws d3 bars from vsCv payload rows", () => {
    const host = mountExample((d3Bundle as ExampleBundle).files["index.html"]);
    injectCustomVizPayload(host, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: ["region", "amount"],
      rows: [
        ["华东", 10],
        ["华北", 20],
      ],
      style: {},
    });
    const rects = host.querySelectorAll("#vs-cv-chart rect");
    expect(rects.length).toBe(2);
  });

  it("ranking strip respects platform labelShow=false from payload style", () => {
    const host = mountExample((htmlBundle as ExampleBundle).files["index.html"]);
    injectCustomVizPayload(host, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: ["region", "amount"],
      rows: [["华东", 10]],
      style: { labelShow: false },
    });
    expect(host.querySelector("#vs-cv-root .lbl")).toBeNull();
    expect(host.querySelector("#vs-cv-root .bar")).toBeTruthy();
  });

  it("d3 example thins axis labels for dense categories", () => {
    const host = mountExample((d3Bundle as ExampleBundle).files["index.html"]);
    const rows = Array.from({ length: 40 }, (_, index) => [`类目${index}`, index + 1]);
    injectCustomVizPayload(host, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: ["region", "amount"],
      rows,
      style: {},
      layout: { width: 320, height: 200 },
    });
    const labels = host.querySelectorAll("#vs-cv-chart text.lbl");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.length).toBeLessThan(rows.length);
  });
});

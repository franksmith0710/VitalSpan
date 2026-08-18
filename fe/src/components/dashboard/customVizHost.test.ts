import { describe, expect, it } from "vitest";
import { mountCustomVizHtml } from "./customVizHost";
import {
  CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
  injectCustomVizPayload,
} from "./custom-viz/customVizPayload";
import type { CustomVizHostElement } from "./custom-viz/customVizRuntime";

describe("mountCustomVizHtml", () => {
  it("runs bundle script and re-renders on vs-cv-payload-update", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    document.body.appendChild(host);
    const html = `<!DOCTYPE html><html><body><div id="vs-cv-root"></div><script>(function(){
      var host=document.currentScript.parentElement;
      function render(p){p=p||host.vsCv.getPayload();var root=host.querySelector('#vs-cv-root');if(!root)return;root.textContent=(p&&p.bindingStatus)||'none'}
      render();
      host.vsCv.onPayload(render);
    })();</script></body></html>`;

    mountCustomVizHtml(host, html);

    expect(host.querySelector("#vs-cv-root")?.textContent).toBe("none");
    injectCustomVizPayload(host, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: [],
      rows: [],
      style: {},
    });
    expect(host.querySelector("#vs-cv-root")?.textContent).toBe("bound");
    host.remove();
  });

  it("exposes vsCv.d3 and onPayload per host instance", () => {
    const a = document.createElement("div");
    a.className = "vs-custom-viz-host";
    const b = document.createElement("div");
    b.className = "vs-custom-viz-host";
    document.body.append(a, b);
    const html = `<!DOCTYPE html><html><body><div id="mark"></div><script>(function(){
      var host=document.currentScript.parentElement;
      var mark=host.querySelector('#mark');
      host.vsCv.onPayload(function(p){mark.textContent=p.bindingStatus});
      mark.textContent=typeof host.vsCv.d3.select;
    })();</script></body></html>`;

    mountCustomVizHtml(a, html);
    mountCustomVizHtml(b, html);

    expect((a as CustomVizHostElement).vsCv?.d3.select).toBeTypeOf("function");
    expect((b as CustomVizHostElement).vsCv?.d3.select).toBeTypeOf("function");
    expect(a).not.toBe(b);
    expect(a.querySelector("#mark")?.textContent).toBe("function");

    injectCustomVizPayload(a, {
      protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
      bindingStatus: "bound",
      columns: ["n"],
      rows: [["x"]],
      style: {},
    });
    expect(a.querySelector("#mark")?.textContent).toBe("bound");
    expect(b.querySelector("#mark")?.textContent).toBe("function");
    a.remove();
    b.remove();
  });
});

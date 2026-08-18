import { describe, expect, it } from "vitest";
import { mountCustomVizHtml } from "./customVizHost";
import { CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION } from "./custom-viz/customVizPayload";

describe("mountCustomVizHtml", () => {
  it("runs bundle script and re-renders on vs-cv-payload-update", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    const html = `<!DOCTYPE html><html><body><div id="vs-cv-root"></div><script>(function(){
      function readPayload(){var n=document.querySelector('.vs-cv-payload');if(!n||!n.textContent)return null;try{return JSON.parse(n.textContent)}catch(e){return null}}
      function bindingStatusOf(p){if(!p)return 'unbound';return p.bindingStatus||'unbound'}
      function render(){var p=readPayload();var root=document.getElementById('vs-cv-root');if(!root)return;root.textContent=(p&&p.bindingStatus)||'none'}
      render();var h=document.currentScript&&document.currentScript.parentElement;if(h&&h.classList.contains('vs-custom-viz-host')){h.addEventListener('vs-cv-payload-update',render)}
    })();</script></body></html>`;

    mountCustomVizHtml(host, html);

    expect(host.textContent).toContain("none");
    host.dispatchEvent(
      new CustomEvent("vs-cv-payload-update", {
        detail: {
          protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
          bindingStatus: "bound",
          columns: [],
          rows: [],
          style: {},
        },
      }),
    );
    expect(host.textContent).toContain("bound");
  });
});

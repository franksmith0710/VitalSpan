import { describe, expect, it } from "vitest";
import { mountCustomVizHtml } from "./customVizHost";

describe("mountCustomVizHtml", () => {
  it("rewrites MutationObserver loops to payload update events", () => {
    const host = document.createElement("div");
    host.className = "vs-custom-viz-host";
    const html = `<!DOCTYPE html><html><body><div id="root"></div><script>(function(){
      function render(){document.getElementById('root').textContent='ok'}
      render();var host=document.querySelector('.vs-custom-viz-host');
      if(host)new MutationObserver(render).observe(host,{childList:true,subtree:true,characterData:true})
    })();</script></body></html>`;

    mountCustomVizHtml(host, html);

    expect(host.textContent).toContain("ok");
    host.dispatchEvent(new CustomEvent("vs-cv-payload-update", { detail: { columns: [], rows: [], style: {} } }));
    expect(host.textContent).toContain("ok");
  });
});

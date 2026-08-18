#!/usr/bin/env node
/**
 * Patch VS-AI-SPEC customViz examples for Payload v1 + vs-cv-payload-update only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = path.join(root, "docs/api/vs-ai-spec/examples");

const RUNTIME_HELPERS =
  "function readPayload(){var n=document.querySelector('.vs-cv-payload');if(!n||!n.textContent)return null;try{return JSON.parse(n.textContent)}catch(e){return null}}" +
  "function bindingStatusOf(p){if(!p)return 'unbound';return p.bindingStatus||((p.rows&&p.rows.length)?'bound':'unbound')}" +
  "function statusHint(p){var st=bindingStatusOf(p);if(st==='error')return(p&&p.error)||'数据加载失败';if(st==='empty')return'暂无数据';if(st==='unbound')return'请在右侧绑定数据集与字段';return null}" +
  "function attachPayloadListener(render){render();var host=document.currentScript&&document.currentScript.parentElement;if(host&&host.classList.contains('vs-custom-viz-host')){host.addEventListener('vs-cv-payload-update',render)}}";

const BUNDLE_SCRIPT =
  "(function(){" +
  RUNTIME_HELPERS +
  "function rowsFromPayload(p){var st=bindingStatusOf(p);if(st!=='bound'||!p||!p.rows||!p.rows.length)return null;var cols=p.columns||[];var di=cols.findIndex(function(c){return c!=='sum'&&c!=='count'});var mi=cols.findIndex(function(c,i){return i!==di});if(di<0)di=0;if(mi<0)mi=1;return p.rows.map(function(r){return{n:String(r[di]),v:Number(r[mi])||0}})}" +
  "function render(){var p=readPayload();var st=(p&&p.style)||{};var root=document.getElementById('vs-cv-root');if(!root)return;var hint=statusHint(p);var data=rowsFromPayload(p);root.innerHTML='';if(hint||!data){var msg=document.createElement('div');msg.style.cssText='padding:12px;font-size:12px;color:var(--dashboard-text-muted,#98a2b3);text-align:center';msg.textContent=hint||'暂无数据';root.appendChild(msg);return}var max=Math.max.apply(null,data.map(function(d){return d.v}).concat([1]));var compact=st.layoutMode==='compact';var show=st.showValue!==false;var prefix=String(st.valuePrefix||'');data.forEach(function(d){var row=document.createElement('div');row.className='row'+(compact?' compact':'');var lbl=document.createElement('span');lbl.className='lbl';lbl.textContent=d.n;row.appendChild(lbl);var bar=document.createElement('div');bar.className='bar';bar.style.width=(d.v/max*100)+'%';row.appendChild(bar);if(show){var val=document.createElement('span');val.className='val';val.textContent=prefix+d.v;row.appendChild(val)}root.appendChild(row)})}" +
  "attachPayloadListener(render)})();";

const D3_SCRIPT =
  "(function(){" +
  RUNTIME_HELPERS +
  "var DEMO=[{n:'华东',v:92},{n:'华南',v:78},{n:'华北',v:65},{n:'西南',v:54}];function sel(q,r){return(r||document).querySelector(q)}function scaleBand(d,r,p){p=p==null?0.2:p;var n=d.length,st=(r[1]-r[0]-(n-1)*p)/n;return function(v){var i=d.indexOf(v);return i<0?undefined:r[0]+i*(st+p)};}scaleBand.bandwidth=function(d,r,p){p=p==null?0.2:p;var n=d.length;return(r[1]-r[0]-(n-1)*p)/n};function scaleLinear(d,r){var a=d[0],b=d[1],ra=r[0],rb=r[1];return function(v){return ra+(v-a)/(b-a||1)*(rb-ra)}}function dataFromPayload(p){var st=bindingStatusOf(p);if(st!=='bound'||!p||!p.rows||!p.rows.length)return null;var cols=p.columns||[];var di=cols.findIndex(function(c){return c!=='sum'&&c!=='count'});var mi=cols.findIndex(function(c,i){return i!==di});if(di<0)di=0;if(mi<0)mi=1;return p.rows.map(function(r){return{n:String(r[di]),v:Number(r[mi])||0}})}" +
  "function render(){var p=readPayload();var svg=sel('#vs-cv-chart');if(!svg)return;var hint=statusHint(p);var data=dataFromPayload(p);svg.innerHTML='';if(hint||!data){var t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x','50%');t.setAttribute('y','50%');t.setAttribute('text-anchor','middle');t.setAttribute('fill','var(--dashboard-text-muted,#98a2b3)');t.setAttribute('font-size','12');t.textContent=hint||'暂无数据';svg.appendChild(t);return}var w=svg.clientWidth||320,h=svg.clientHeight||200,pad=28,iw=w-pad*2,ih=h-pad*2;var g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform','translate('+pad+','+pad+')');svg.appendChild(g);var x=scaleBand(data.map(function(d){return d.n}),[0,iw]);var y=scaleLinear([0,Math.max.apply(null,data.map(function(d){return d.v}).concat([1]))],[ih,0]);var bw=scaleBand.bandwidth(data.map(function(d){return d.n}),[0,iw]);data.forEach(function(d){var rx=x(d.n),ry=y(d.v),bh=ih-y(d.v);var rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',rx);rect.setAttribute('y',ry);rect.setAttribute('width',bw);rect.setAttribute('height',bh);rect.setAttribute('fill','var(--vs-d3-accent)');rect.setAttribute('rx','3');g.appendChild(rect);var tx=document.createElementNS('http://www.w3.org/2000/svg','text');tx.setAttribute('x',rx+bw/2);tx.setAttribute('y',ih+16);tx.setAttribute('text-anchor','middle');tx.textContent=d.n;g.appendChild(tx)})}" +
  "attachPayloadListener(render)})();";

const PULSE_KPI = {
  manifest: {
    id: "pulse-kpi-ribbon-v1",
    displayName: "脉冲 KPI 指标带",
    version: "1.0.0",
    entry: "index.html",
    fieldSlots: {
      dimensions: { min: 1, max: 1, label: "指标名称" },
      metrics: { min: 1, max: 1, label: "指标数值" },
    },
    styleSchema: {
      type: "object",
      properties: {
        accentColor: { type: "string", format: "color" },
        glowIntensity: { type: "number", minimum: 0, maximum: 100 },
        cardGap: { type: "number", minimum: 4, maximum: 32 },
      },
    },
    defaultStyle: { accentColor: "#38bdf8", glowIntensity: 40, cardGap: 12 },
    rendererHint: "vanilla",
  },
  files: {},
};

const pulseHtml =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent;color:var(--dashboard-text-primary,#e2e8f0);font-family:system-ui,sans-serif}#vs-cv-kpi{display:flex;gap:var(--vs-style-card-gap,12px);padding:12px;height:100%;box-sizing:border-box;align-items:stretch}.card{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14px 10px;background:var(--dashboard-widget-surface,#1e293b);border:1px solid var(--dashboard-widget-border,#344054);border-radius:8px;min-width:0}.lbl{font-size:12px;color:var(--dashboard-text-muted,#98a2b3);margin-bottom:6px}.val{font-size:22px;font-weight:700}.hint{padding:12px;font-size:12px;color:var(--dashboard-text-muted,#98a2b3);text-align:center;width:100%}</style></head><body><div id="vs-cv-kpi"></div><script>' +
  "(function(){" +
  RUNTIME_HELPERS +
  "function cardsFromPayload(p){var st=bindingStatusOf(p);if(st!=='bound'||!p||!p.rows||!p.rows.length)return null;var cols=p.columns||[];var di=0;var mi=cols.length>1?1:0;return p.rows.map(function(r){return{n:String(r[di]),v:String(r[mi])}})}" +
  "function render(){var p=readPayload();var root=document.getElementById('vs-cv-kpi');if(!root)return;var hint=statusHint(p);var cards=cardsFromPayload(p);root.innerHTML='';if(hint||!cards){var msg=document.createElement('div');msg.className='hint';msg.textContent=hint||'暂无数据';root.appendChild(msg);return}cards.forEach(function(c){var el=document.createElement('div');el.className='card';var lbl=document.createElement('div');lbl.className='lbl';lbl.textContent=c.n;el.appendChild(lbl);var val=document.createElement('div');val.className='val';val.textContent=c.v;el.appendChild(val);root.appendChild(el)})}" +
  "attachPayloadListener(render)})();" +
  "</script></body></html>";

PULSE_KPI.files["index.html"] = pulseHtml;

function patchHtmlScript(html, newScript) {
  return html.replace(/<script>[\s\S]*<\/script>/, `<script>${newScript}</script>`);
}

function patchFile(relPath, mutator) {
  const full = path.join(examplesDir, relPath);
  const doc = JSON.parse(fs.readFileSync(full, "utf8"));
  mutator(doc);
  fs.writeFileSync(full, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log("patched", relPath);
}

patchFile("custom-viz-bundle.json", (doc) => {
  doc.files["index.html"] = patchHtmlScript(doc.files["index.html"], BUNDLE_SCRIPT);
});

patchFile("custom-viz-d3-bundle.json", (doc) => {
  doc.files["index.html"] = patchHtmlScript(doc.files["index.html"], D3_SCRIPT);
});

const RING_PROGRESS_SCRIPT =
  "(function(){" +
  RUNTIME_HELPERS +
  "var NS='http://www.w3.org/2000/svg';" +
  "function rowsFromPayload(p){var st=bindingStatusOf(p);if(st!=='bound'||!p||!p.rows||!p.rows.length)return null;var cols=p.columns||[];var di=cols.findIndex(function(c){return c!=='sum'&&c!=='count'});var mi=cols.findIndex(function(c,i){return i!==di});if(di<0)di=0;if(mi<0)mi=1;return p.rows.map(function(r){return{n:String(r[di]),v:Math.min(100,Math.max(0,Number(r[mi])||0))}})}" +
  "function ringSvg(pct,th){var size=72,r=(size-th)/2,c=2*Math.PI*r,off=c*(1-pct/100);var svg=document.createElementNS(NS,'svg');svg.setAttribute('width',String(size));svg.setAttribute('height',String(size));svg.setAttribute('viewBox','0 0 '+size+' '+size);var track=document.createElementNS(NS,'circle');track.setAttribute('cx',String(size/2));track.setAttribute('cy',String(size/2));track.setAttribute('r',String(r));track.setAttribute('fill','none');track.setAttribute('stroke','var(--vs-style-track-color,#334155)');track.setAttribute('stroke-width',String(th));svg.appendChild(track);var arc=document.createElementNS(NS,'circle');arc.setAttribute('cx',String(size/2));arc.setAttribute('cy',String(size/2));arc.setAttribute('r',String(r));arc.setAttribute('fill','none');arc.setAttribute('stroke','var(--vs-style-accent-color,#818cf8)');arc.setAttribute('stroke-width',String(th));arc.setAttribute('stroke-linecap','round');arc.setAttribute('stroke-dasharray',String(c));arc.setAttribute('stroke-dashoffset',String(off));arc.setAttribute('transform','rotate(-90 '+size/2+' '+size/2+')');svg.appendChild(arc);if(pct>=0){var txt=document.createElementNS(NS,'text');txt.setAttribute('x',String(size/2));txt.setAttribute('y',String(size/2+4));txt.setAttribute('text-anchor','middle');txt.setAttribute('fill','var(--dashboard-text-primary,#e2e8f0)');txt.setAttribute('font-size','13');txt.setAttribute('font-weight','600');txt.textContent=Math.round(pct)+'%';svg.appendChild(txt)}return svg}" +
  "function render(){var root=document.getElementById('vs-cv-rings');if(!root)return;var p=readPayload();var hint=statusHint(p);var st=(p&&p.style)||{};var th=Number(st.ringThickness)||8;var show=st.showPercent!==false;var data=rowsFromPayload(p);root.innerHTML='';if(hint||!data){var msg=document.createElement('div');msg.style.cssText='padding:12px;font-size:12px;color:var(--dashboard-text-muted,#98a2b3);text-align:center;width:100%';msg.textContent=hint||'暂无数据';root.appendChild(msg);return}data.slice(0,8).forEach(function(d){var wrap=document.createElement('div');wrap.className='item';var svg=ringSvg(d.v,th);if(!show){var t=svg.querySelector('text');if(t)t.remove()}wrap.appendChild(svg);var lbl=document.createElement('div');lbl.className='lbl';lbl.textContent=d.n;wrap.appendChild(lbl);root.appendChild(wrap)})}" +
  "attachPayloadListener(render)})();";

const ALERT_FEED_SCRIPT =
  "(function(){" +
  RUNTIME_HELPERS +
  "function rowsFromPayload(p){var st=bindingStatusOf(p);if(st!=='bound'||!p||!p.rows||!p.rows.length)return null;var cols=p.columns||[];var di=cols.findIndex(function(c){return c!=='sum'&&c!=='count'});var mi=cols.findIndex(function(c,i){return i!==di});if(di<0)di=0;if(mi<0)mi=1;return p.rows.map(function(r){return{n:String(r[di]),v:Number(r[mi])||0}})}" +
  "function levelClass(v){if(v>=3)return'danger';if(v>=2)return'warn';return''}" +
  "function levelLabel(v){if(v>=3)return'严重';if(v>=2)return'警告';if(v>=1)return'提示';return'信息'}" +
  "function render(){var track=document.getElementById('vs-cv-track');if(!track)return;var p=readPayload();var hint=statusHint(p);var st=(p&&p.style)||{};var speed=Number(st.scrollSpeed)||48;track.style.setProperty('--vs-style-scroll-speed',speed+'s');track.innerHTML='';if(hint){var msg=document.createElement('div');msg.style.cssText='padding:12px;font-size:12px;color:var(--dashboard-text-muted,#98a2b3);text-align:center';msg.textContent=hint;track.style.animation='none';track.appendChild(msg);return}track.style.animation='';var data=rowsFromPayload(p);if(!data){var empty=document.createElement('div');empty.style.cssText='padding:12px;font-size:12px;color:var(--dashboard-text-muted,#98a2b3);text-align:center';empty.textContent='暂无数据';track.appendChild(empty);return}var maxVis=Number(st.maxVisible)||6;var slice=data.slice(0,maxVis*2);slice.concat(slice).forEach(function(d){var row=document.createElement('div');row.className='row '+levelClass(d.v);var badge=document.createElement('span');badge.className='badge';badge.textContent=levelLabel(d.v);row.appendChild(badge);var msg=document.createElement('span');msg.className='msg';msg.textContent=d.n;row.appendChild(msg);track.appendChild(row)})}" +
  "attachPayloadListener(render)})();";

patchFile("custom-viz-ring-progress.json", (doc) => {
  doc.files["index.html"] = patchHtmlScript(doc.files["index.html"], RING_PROGRESS_SCRIPT);
});

patchFile("custom-viz-alert-feed.json", (doc) => {
  doc.files["index.html"] = patchHtmlScript(doc.files["index.html"], ALERT_FEED_SCRIPT);
});

fs.writeFileSync(
  path.join(examplesDir, "custom-viz-pulse-kpi.json"),
  `${JSON.stringify(PULSE_KPI, null, 2)}\n`,
  "utf8",
);
console.log("wrote custom-viz-pulse-kpi.json");

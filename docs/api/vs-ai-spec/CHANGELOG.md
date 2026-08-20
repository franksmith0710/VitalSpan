# vs-ai-spec 变更

## 2026-08-20 (Phase 3)

- **styleHooks**：自愿 manifest 映射 → FE Hook Bridge；入库 warn + `styleComplianceTier`
- 组件库 Hub 预览与编辑页共用 `CustomVizWidget` + 默认看板 preview 主题
- 脚手架 `scripts/scaffold-custom-viz-html.mjs`

## 2026-08-20 (Phase 1)

- **样式合规 Phase 1**：`AiVizArtifactOut.warnings[]`（POST/PUT/GET 返回，不阻断入库）
- 新增 [guides/CUSTOM-VIZ-STYLE-COMPLIANCE.md](./guides/CUSTOM-VIZ-STYLE-COMPLIANCE.md)
- 官方 `custom-viz-*.json` CI：须零 style warnings

## 2026-08-19

- **PLATFORM-SLA**：`vsCv.mount` 统一 lifecycle；Payload `axisPlan`；壳层 truncated；d3 入库须 `vsCv.mount`
- 新增 [guides/PLATFORM-SLA.md](./guides/PLATFORM-SLA.md) · [guides/HTML-RUNTIME.md](./guides/HTML-RUNTIME.md)
- 官方示例改为 `boot()` → `host.vsCv.mount`；d3 消费 `axisPlan.categoryTickIndices`

## 2026-08-18c

- 官方示例禁止 `document.getElementById`，改为宿主内 `querySelector`（同页多实例）
- 联调：必须服务端/本机脚本 POST；浏览器跨域会 CORS 失败
- GET artifact meta/entry：有 `dashboard:read` 即可（共享看板）；列表与 PUT 仍仅属主

## 2026-08-18b

- 增加 `00-REQUIREMENTS.md`：完成定义=HTTP 201+artifactId；禁止写桌面/打开本地 html
- `tools/upload-ai-viz-artifact.py` 随包装走，本机可 POST 黄金样例

## 2026-08-18

- 明确 L3 runtime **仅 html | d3**（非 vanilla/react/webgl）
- `schemas/layout-v2.schema.json` 作为 `layout.schema.json` 的文件名别名
- 补 `styles.schema.json`、`tokens.schema.json`
- artifact schema：`runtime`、单文件上限与后端 2MB 对齐
- `HANDOFF.md` 增加误读对照

# vs-ai-spec 变更

## 2026-08-25 (Phase 4 · B 轨 v0.3.0 交付)

- 用户 Phase 4 手测全过；契约 §3 更新为 **v0.3.0 已交付**
- E2E §1 勾选；§2–§3 smoke/CI；§4–§5 按需 wf2 金样回归
- 修复 `test_agent_tools_schema` 对齐 14 tools

## 2026-08-25 (Phase 3 审计 · Phase 4 手测指南)

- Task 1–8 + release 验收落盘；`ids-sync.test` 加入 smoke
- Phase 4 手测指南：区分 DeepTalk 插件页 vs 5173 管理面

## 2026-08-25 (Phase 2 spike 闭合 · Phase 3 启动)

- Spike **8/10** 通过（DeepTalk 日志 + `spike-host-verify.mjs`）；#4/#10 延后 Phase 4
- 插件 `npm run smoke` 回归绿
- Phase 3 Task 1–9 正式验收进行中

## 2026-08-24 (B 轨决策 · Phase 0/1)

- Phase 0：**B 轻量工作区** 决策闭合（用户确认）
- Phase 1：`WORKSPACE-PLUGIN-CONTRACT` §1.1 iframe 口径 · §3 改回 v0.2.16 基线 · §5 正式决策
- `SPECIAL-WORKSPACE-PLUGIN-TASK.md`：Phase 2 spike 门控 · B-min Task 8 · 目录对齐 release.mjs
- 评审落盘：`docs/reviews/grounded/2026-08-24-deeptalk-vitalspan-*-adjudication.md`
- **下一步**：Phase 2 DeepTalk spike（≥8/10）通过后 Phase 3 Task 1–9

## 2026-08-24 (工作区插件形态 · 文档收口)

- 产品对接真源：[deeptalk-product/WORKSPACE-PLUGIN-CONTRACT.md](./deeptalk-product/WORKSPACE-PLUGIN-CONTRACT.md)
- 新增 [SPECIAL-WORKSPACE-PLUGIN-TASK.md](./deeptalk-product/SPECIAL-WORKSPACE-PLUGIN-TASK.md) · [PREFLIGHT-DUAL-TRACK.md](./deeptalk-product/PREFLIGHT-DUAL-TRACK.md)
- 修订 `deeptalk-product/README` · `AGENT-SYSTEM-PROMPT` · `E2E-CHECKLIST` · `IRON-RULES` §7 · `DEEPTALK-AGENT-PROMPT` · Cursor 规则
- `integrations/vitalspan/` + `executor/cli.py` 降级为 **开发/CI 备用**；产品路径 = vitalspan 插件 zip + 特殊工作区

## 2026-08-20 (MVP 无源码上传)

- 新增 [MVP-UPLOAD.md](./MVP-UPLOAD.md) · `tools/mvp-upload.py` · 根目录 `upload-component.ps1`
- `local.config.json.example`：API / VITALSPAN_ROOT 本地配置；支持 `--from output/` 复制入库
- 无 DeepTalk 发版即可 POST 入库（给接口即用）

## 2026-08-20 (DeepTalk 产品级对接)

- 新增 [deeptalk-product/](./deeptalk-product/)：AGENT-SYSTEM-PROMPT · config 模板 · agent-tools.schema.json
- 新增 `deeptalk-product/executor/`：publish 执行器 · completion_gate · `cli.py` 六工具
- 新增 `scripts/sync-vs-ai-spec-to-deeptalk-repo.ps1` → `integrations/vitalspan/`
- 测试：`backend/tests/test_deeptalk_product_integration.py`

## 2026-08-20 (一体集成完善)

- 新增 [IRON-RULES.md](./IRON-RULES.md) · Cursor 规则 `deeptalk-vitalspan-integration.mdc`
- 新增 `tools/publish-ai-viz-artifact.py` · `check-vitalspan-health.py` · `list-ai-viz-artifacts.py` · `delete-ai-viz-artifact.py`
- 新增金样 `examples/custom-viz-trend-line.json`（d3 动态趋势 · `p.style` 合规）
- 平台 `DELETE /api/v1/ai-viz/artifacts/{id}`；5173 图表盘属主移除
- 文档口径：「外部规范包」→ **DeepTalk 集成项目 × VitalSpan 平台能力**

## 2026-08-20 (三条线工程分离)

- 新增 [guides/THREE-WORKFLOWS.md](./guides/THREE-WORKFLOWS.md)：② 组件库入库 vs ③ 大屏复用已有+新建
- 重写 `START-HERE` / `EXTERNAL-AUTHOR` / `DASHBOARD-LAYOUT` / `DEEPTALK-AGENT-PROMPT` 按工作流编号

## 2026-08-20 (工程身份写清)

- 新增 [PACK-IDENTITY.md](./PACK-IDENTITY.md)：集成规范包 ≠ 组件项目目录；平台真系统在 :8000
- 新增 [DEEPTALK-AGENT-PROMPT.md](./DEEPTALK-AGENT-PROMPT.md)：禁止「项目目录 / output 完成」话术

## 2026-08-20 (三条路径 Runbook)

- 新增 [START-HERE.md](./START-HERE.md)：总入口、三条路径完成判据、一键命令
- 新增 [guides/L1-L2-CHART-CONFIG.md](./guides/L1-L2-CHART-CONFIG.md) · `examples/line|pie-manual-deStyle.json`
- 新增 [guides/DASHBOARD-LAYOUT.md](./guides/DASHBOARD-LAYOUT.md)
- 新增 `tools/validate-chart-config.py` · `upload-dashboard-layout.py` · `vitalspan_http.py`

## 2026-08-20 (对外暴露与入库判据写清)

- **00-REQUIREMENTS §0**：规范包 ≠ 上传目的地；入库端点、禁止 `output/`、禁止「VS Code 扩展可用」等误读
- **EXTERNAL-AUTHOR**：禁止的完成说法表；汇报必须带 `artifactId`

## 2026-08-20 (外部作者打通)

- 新增 [EXTERNAL-AUTHOR.md](./EXTERNAL-AUTHOR.md)：validate → upload → `artifactId` 三步；明确 `write_file` ≠ 入库
- `tools/validate-ai-viz-bundle.py` + `bundle_preflight.py`：本地与 API 相同 lint（含 `AIVIZ_MOUNT_REQUIRED`、style warnings）
- `upload-ai-viz-artifact.py`：默认先 preflight；`--validate-only`；成功打印 `warnings` / `styleComplianceTier`
- VitalSpan 仓 `scripts/sync-vs-ai-spec-pack.ps1` 同步本包到桌面联调目录（非镜像，保留外部 examples）
- `scripts/pack-vs-ai-spec-deeptalk-test.ps1` 重打 `docs/api/vs-ai-spec-deeptalk-test.zip`

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

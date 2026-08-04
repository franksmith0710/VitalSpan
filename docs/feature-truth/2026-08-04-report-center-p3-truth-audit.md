# Feature Truth Audit: 报表中心 P3-SMOKE 最终形态

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-04（复验） |
| 核验范围 | P3 Phase 1–5 全量 + 报表消费主路径（Hub / View / 模板 / 调度 / 导出 / Dataset） |
| 锚点 | `reports/persistence/` · `reports/render/` · `engine/execute.py` · `scheduler/executor.py` · `fe/src/pages/admin/reports/` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **7.4 / 10 · B** |
| 状态 | approved-fix |
| **sampling** | `full`（P3-T1…T16 + 关键 FE smoke + G5 live 交叉） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| P3-T1 | `RPT_METADATA_STORE=db` 时 catalog CRUD 跨进程可读 | Plan Phase 1.4 |
| P3-T2 | catalog/extension/prefab/templates 经 repo，无裸 dict 写路径 | Plan Phase 1.3 |
| P3-T3 | Alembic `0034` 创建 `report_*` 表 | Plan Phase 1.2 |
| P3-T4 | PDF 导出以 `%PDF` 开头且含 query section rows | Plan Phase 2.3 |
| P3-T5 | Excel/Word 为 PK zip 真字节（非 label 占位） | Plan Phase 2.1 |
| P3-T6 | IF-03 `GET /reports/export` 走 RenderSpec renderer | Plan Phase 2.2 |
| P3-T7 | 模板调度 execute → SMTP 附件 `artifactKind=template_render` + `%PDF` | Plan Phase 2.2/4.2 |
| P3-T8 | extension metric `queryMode=dataset` → run 返回 rows | Plan Phase 3.4 |
| P3-T9 | FE 可切换 SQL/Dataset 并绑定 `datasetId`/`boundConfigId` | Plan Phase 3.3 |
| P3-T10 | web 模板节点 run `format=pdf` → 422 | Plan Phase 2 守卫 |
| P3-T11 | staging 默认 `RPT_*_STORE=db` + artifact fs + SMTP/FE 环境 | Plan Phase 4.1 |
| P3-T12 | pytest mock SMTP 模板调度 PDF 附件 | Plan Phase 4.2 |
| P3-T13 | `DashboardEditPage`「定时推送」打开 sheet | Plan Phase 4.3 |
| P3-T14 | live：MailHog 收到模板调度 `%PDF` 附件 | Plan Phase 4.2 |
| P3-T15 | 手测 Case 19/20 可执行且通过 | Plan Phase 5 |
| P3-T16 | `reports.md` / `F08-RPT.md` / `api/README.md` 同步 | Plan Phase 5 |

- **非目标**：Jasper WYSIWYG · 组合调度粒度 · Celery · 飞书 webhook · S3 artifact（Plan 明确排除）

## 2. 完整链路图

```
/admin/reports/center → catalog 授权模板
  → /view/:nodeId → POST /reports/templates/{id}/run → renderSpec
  → ReportExportCard → GET /reports/export → render bytes → download
  → SchedulePanel → POST/PATCH /reports/schedules → execute → SMTP 附件

编辑页「定时推送」→ DashboardScheduleSheet → 同上调度链
```

| 序 | 层 | 状态 | L1 证据 | 说明 |
|----|----|------|---------|------|
| 1 | 元数据 repo | 通 | `test_report_metadata_db_store.py` PASSED | db 模式单测；**运行时默认仍 memory** |
| 2 | RenderSpec→PDF | 通 | `test_report_template_real_export.py` PASSED | mock query + `%PDF` |
| 3 | RenderSpec→Excel/Word | 部分通 | `render_document` 单测仅 PDF；m10 word exportHook | **无 Excel/Word 字节断言单测** |
| 4 | Dataset execute | 通 | `test_report_engine_dataset_bridge.py` PASSED | 后端桥接 OK |
| 5 | Dataset FE | **断** | `TemplateDetailPanel.tsx` 无 `datasetId` 字段 | UI 无法完成 Dataset 绑定 |
| 6 | 模板调度 SMTP | 通 | `test_template_schedule_smtp_pdf_attachment` PASSED | mock SMTP + `%PDF` |
| 7 | Live FE+MailHog | **断** | `test_g5_live_export.py` 3 SKIPPED | FE :5173 不可达 |
| 8 | FE smoke 报表域 | 通 | vitest reports 29/29 PASSED | 含 EditPage schedule 1/1 |
| 9 | m9 ACL 回归 | **假绿风险** | `test_m9_rpt_theme_r233.py` 4 FAILED | `PERMISSION_DENIED` vs 域码 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| P3-T1 | 元数据 DB 持久化 | REAL | 9/A | `test_report_metadata_db_store.py` |
| P3-T2 | repo 抽象 | REAL | 8/B | `persistence/*_repo.py`；测试仍 `_nodes` 别名 |
| P3-T3 | migration 0034 | REAL | 8/B | 文件存在；未在本轮跑 alembic upgrade 全链 |
| P3-T4 | PDF 真渲染 | REAL | 9/A | reportlab + export pytest |
| P3-T5 | Excel/Word 真渲染 | PARTIAL | 6/C | 实现存在；**缺 L1 字节单测** |
| P3-T6 | IF-03 接线 | PARTIAL | 7/B | `reports_export.py` 接线；FE 未断言文件头 |
| P3-T7 | 调度模板附件 | REAL | 9/A | `test_template_schedule_smtp_pdf_attachment` |
| P3-T8 | Dataset execute BE | REAL | 8/B | `test_report_engine_dataset_bridge.py` |
| P3-T9 | Dataset FE | **PARTIAL** | 5/C | 仅 `queryMode` select；**无 DatasetBindPanel** |
| P3-T10 | format 守卫 | REAL | 8/B | `test_rpt003_09_run_pdf_non_export_kind_422` |
| P3-T11 | staging 默认 db | **PARTIAL** | 5/C | `.env.example` 注释示例；`config.py` 默认 **memory** |
| P3-T12 | mock SMTP 调度 | REAL | 9/A | dashboard schedule 套件 14/14（含模板） |
| P3-T13 | EditPage smoke | REAL | 8/B | `DashboardEditPage.schedule.smoke.test.tsx` 1/1 |
| P3-T14 | live MailHog | **UNVERIFIED** | 4/D | `test_template_schedule_smtp_live` SKIPPED |
| P3-T15 | 手测 Case 19/20 | **PARTIAL** | 6/C | 文档已写；**本轮未手测执行** |
| P3-T16 | 文档同步 | REAL | 8/B | services/prd/api 已更新 |

**T 汇总**：8 REAL · 6 PARTIAL · 1 UNVERIFIED · 0 STUB → **总体 PARTIAL（不可标「全部可用」）**

## 3b. 前端控件下钻表

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | Hub 搜索/筛选 | ReportCenterPage | 过滤模板 | vitest 6/6 ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `report-center.smoke.test.tsx` |
| B2 | 打开模板运行 | ReportViewPage | auto-run + 表格 | vitest 2/2 ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `ReportViewPage.smoke.test.tsx` |
| B3 | 发起导出 | ReportExportCard | 轮询 + 下载真 PDF | 轮询 ✓；**未验 %PDF** | 2 | 1 | 1 | 2 | 2 | 8 | PARTIAL | `ReportExportCard.smoke.test.tsx` |
| B4 | 扩展保存 | TemplateDetailPanel | metrics + changeNote | vitest 保存 toast ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `report-templates.smoke.test.tsx` |
| B5 | 查数模式 SQL/Dataset | TemplateDetailPanel | Dataset 可选 bind | 仅 mode select；**无 bind UI** | 1 | 0 | 1 | 2 | 2 | 6 | PARTIAL | `TemplateDetailPanel.tsx:169-178` |
| B6 | 调度创建/重试 | SchedulePanel | FSM + 历史 | vitest 2/2 ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `SchedulePanel.smoke.test.tsx` |
| B7 | 立即激活 | ScheduleActivationBanner | draft→scheduled | 组件存在；**无 dedicated vitest** | 1 | 1 | 2 | 2 | 2 | 8 | PARTIAL | Plan 4.3 未闭合 |
| B8 | 定时推送 | DashboardEditPage | 打开 sheet | vitest 1/1 ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `DashboardEditPage.schedule.smoke.test.tsx` |
| B9 | 预制运行 | PrefabReportsPage | run → sections | vitest 6/6 ✓ | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `prefab-reports.smoke.test.tsx` |

Out 控件（不验）：BatchImportPanel 细项块编辑 · Jasper 设计器 · 组合调度粒度

## 3d. 覆盖矩阵

| 实体 ID | 类型 | GATE | CHAIN | UI | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|------|---|---|------|------|
| P3-T1 | 元数据 DB | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | `test_report_metadata_db_store.py` |
| P3-T2 | repo 抽象 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | 代码审阅 + m10 19/19 |
| P3-T3 | migration | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | `0034_*.py` 存在 |
| P3-T4 | PDF 导出 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | `test_report_template_real_export.py` |
| P3-T5 | Excel/Word | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | 无字节 L1 |
| P3-T6 | IF-03 | ✅ | ✅ | ❌ | CHAIN | 2 | 1 | PARTIAL | BE 通；FE 未验内容 |
| P3-T7 | 模板调度附件 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | `test_template_schedule_smtp_pdf_attachment` |
| P3-T8 | Dataset BE | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | `test_report_engine_dataset_bridge.py` |
| P3-T9 | Dataset FE | ✅ | ❌ | ⚠️ | GATE | 1 | 0 | PARTIAL | 无 bind 字段 |
| P3-T10 | format 守卫 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | m10 rpt003_09 |
| P3-T11 | staging env | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | 默认 memory |
| P3-T12 | mock SMTP | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | schedule pytest |
| P3-T13 | EditPage smoke | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | vitest 1/1 |
| P3-T14 | live MailHog | ❌ | ❌ | ❌ | NONE | 0 | 0 | UNVERIFIED | 3 skipped |
| P3-T15 | 手测 19/20 | ✅ | ❌ | ❌ | GATE | 1 | 0 | PARTIAL | 仅文档 |
| P3-T16 | 文档 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | docs 已同步 |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | 16 |
| GATE only | 4（T3/T5/T11/T15） |
| CHAIN | 10 |
| UI / BROWSER | 1（T13） |
| NONE（未验） | 1（T14 live） |
| REAL 达标 | 8 / 16 |
| **逐一校验** | **否** — T5/T9/T11/T14/T15 未达 REAL；m9 4 项 ACL 回归失败 |
| 总体可否 REAL | **否** |

## 3c. 五维评分汇总

| ID | L | C | D | E | F | 总分 | 档位 | 真假 | 备注 |
|----|---|---|---|---|---|------|------|------|------|
| B5 | 1 | 0 | 1 | 2 | 2 | 6 | C | PARTIAL | Dataset 模式无法绑 config |
| B3 | 2 | 1 | 1 | 2 | 2 | 8 | B | PARTIAL | 导出未验文件内容 |
| B7 | 1 | 1 | 2 | 2 | 2 | 8 | B | PARTIAL | 无 smoke |
| P3-T14 | 0 | 0 | 0 | 0 | 0 | 0 | F | UNVERIFIED | live skip |

**打通但不对**（L≥2 且 C≤1）：B3（导出内容未验）  
**假功能风险**：无（主路径非 STUB）；**GATE-only**：T3/T5/T11

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | **期望** | **实际** | 一致？ | 证据 |
|------|------|----------|----------|--------|------|
| 1 | pytest P3 套件 | 全绿 | **46 passed, 3 skipped** | ⚠️ | 2026-08-04 17:35 本机 |
| 2 | vitest reports + EditPage | 全绿 | **29 passed** | ✅ | 同上 |
| 3 | pytest m9 回归 | 全绿 | **4 failed**（ACL 码） | ❌ | `PERMISSION_DENIED` vs `RPT_ENGINE_FORBIDDEN` |
| 4 | live FE probe | 200 @5173 | SKIPPED | ❌ | uvicorn :8000 通，FE 未起 |
| 5 | live MailHog 模板调度 | 收件含 PDF | SKIPPED | ❌ | `test_template_schedule_smtp_live` |
| 6 | 默认 config | staging db | `rpt_*_store=memory` | ❌ | `config.py:50-51` |

## 5. 修复文档

### P3-T9 — Dataset FE 绑定（B5）

**判定 / 得分**：PARTIAL 6/10，C=0  
**期望 vs 实际**：Plan 要求复用 `DatasetBindPanel` 选 `datasetId`+`boundConfigId`；实际仅 `<select queryMode>`，保存的 metric 无 bind 字段。  
**根因**：`fe/src/pages/admin/reports/components/TemplateDetailPanel.tsx` 未接入 `DatasetBindPanel`。  
**修复方向**：扩展 Tab 在 `queryMode=dataset` 时嵌入 `DatasetBindPanel`；保存 body 带 `datasetId`/`boundConfigId`。  
**修后验收**：vitest 覆盖 Dataset 模式保存 + BE bridge 单测仍绿，C≥2，REAL。

### P3-T14 — Live MailHog 签收

**判定**：UNVERIFIED  
**期望 vs 实际**：staging 栈 FE+MailHog+uvicorn 齐 → live 测试绿；实际 FE :5173 不可达，3 integration skip。  
**修复方向**：按 Case 18/19 启动栈；`pnpm dev --host 127.0.0.1 --port 5173` + `docker compose up mailhog`；复跑 `test_g5_live_export.py`。  
**优先级**：P0（生产签收门禁）

### P3-T11 — staging 默认持久化

**判定**：STUB/PARTIAL  
**根因**：`config.py` 默认 memory；`.env.example` 仅注释，无 `docs/material/deploy/` 启动顺序。  
**修复方向**：staging compose/.env 显式 `RPT_SCHEDULE_STORE=db` + `RPT_METADATA_STORE=db`；补 deploy log。  
**优先级**：P1

### P3-T5 — Excel/Word L1

**判定**：STUB  
**修复方向**：`test_report_template_real_export.py` 增 excel/word `render_document` 断言 PK zip + 含 section 数据。  
**优先级**：P1

### m9 ACL 回归（4 failed）

**根因**：middleware 统一 `PERMISSION_DENIED` vs 测试期望 `RPT_ENGINE_FORBIDDEN` / `RPT_PREFAB_*`。  
**修复方向**：对齐测试或恢复域错误码透传（择一，与 PRD 一致）。  
**优先级**：P1

### B7 — ScheduleActivationBanner vitest（Plan 4.3）

**修复方向**：`ScheduleActivationBanner.test.tsx` 断言点击「立即激活」触发 `onActivate`。  
**优先级**：P2

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| P0 | P3-T14 | 起 FE+MailHog，跑通 live integration |
| P0 | P3-T9 | FE 接入 DatasetBindPanel，否则 Dataset 桥接不可端到端用 |
| P1 | P3-T11 | staging 默认 db + deploy 文档 |
| P1 | P3-T5 | Excel/Word 字节 L1 单测 |
| P1 | m9 | ACL 错误码 4 项回归 |
| P2 | B7 | ScheduleActivationBanner vitest |
| P2 | B3 | ReportExportCard 下载后断言 `%PDF`/PK |

## 7. 交接

- **结论**：**不能**宣称「全部可用」。后端 P3 主链（持久化·PDF 导出·Dataset execute·模板调度 mock SMTP）已 **CHAIN 级 REAL**；**Live 签收、Dataset FE、Excel/Word L1、staging 默认 db、手测执行** 未闭合。
- 建议：批准 P0 后交接 `root-first-solve` 或按上表逐项修复。
- 用户批准修复：**否**（本轮仅审计）

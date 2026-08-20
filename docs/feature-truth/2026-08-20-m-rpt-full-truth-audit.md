# Feature Truth Audit: M-RPT 报表中心必做能力（F-A～F-C）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-20 |
| 核验范围 | **§M-RPT 必做 gate**（F-A 4 + F-B 3 + F-C 3 = 10 项）；不含 F-D 可选 |
| 锚点 | `docs/automate/plan.md` §M-RPT · `prd/F08-RPT.md` · `fe/src/pages/admin/reports/**` · `backend/app/reports/**` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **7/10 · B**（必做主路径 CHAIN 已通；UI/真机与部分正确性未满分） |
| 状态 | draft |
| **sampling** | `full`（10 项必做全枚举；未缩 scope） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T-A1 | 标准分析 `sourceType=standard`：创建调度 → execute → 非 `mock_succeeded`；SMTP 未配则 `failed` + 人话错误 | F08 RPT-005 F-A · plan F-A |
| T-A2 | `GET /schedules`、`GET .../executions` 空库可调、不 500 | F08 RPT-005 F-A |
| T-A3 | 模板页 smoke 选择器与实现一致，vitest 全绿 | F08 RPT-003 F-A |
| T-A4 | 标准分析配置保存后出现「创建定时投递」CTA，跳转预填 packKey | F08 RPT-002 F-A |
| T-B1 | 快照超过 retention N 期后旧期被 prune，compare 不含已删期 | F08 RPT-002 F-B |
| T-B2 | 新建分析包默认 Dataset 绑定；物理表路径 deprecated 提示 | F08 RPT-002 F-B |
| T-B3 | Hub/结果页展示口径·快照·留存·投递可观测条（实时/对比一致） | F08 RPT-002 F-B |
| T-C1 | 绑定维度字典的列在 run 结果展示 label；失败旁注 | F08 RPT-001 F-C · META-003 |
| T-C2 | 导出 PDF/Excel 列值与 Web 展现共用翻译链 | F08 RPT-001 F-C |
| T-C3 | 模板首进：空态 seed-demo → 运行/导出 CTA；60s 内可完成首次导出（有数据源环境） | F08 RPT-003 F-C |

- **非目标**：F-D 交叉表/套打/另存为；库内 GROUP BY（F-B 可选）；组合调度粒度枚举；全量 F08 RPT-001～007 历史 companion 重验

## 2. 完整链路图（M-RPT 主路径）

```
模板首进: ReportTemplatesPage → POST seed-demo → catalog → ReportViewPage → run/export
标准分析: Hub → run/compare → 配置页 → schedules CTA → semi_real execute → SMTP/IM
治理: snapshot capture → retention prune → observability strip
```

| 序 | 层 | 状态 | L1 证据 |
|----|----|------|---------|
| 1 | 标准分析投递 | **通（mock 边界）** | `backend/tests/test_report_schedule_trust_chain.py` 5/5 |
| 2 | 调度探针 | **通** | 同上 list/executions |
| 3 | 快照 retention | **通** | `backend/tests/test_standard_snapshot_retention.py` 2/2 |
| 4 | 码值翻译 | **部分通** | `backend/tests/test_report_label_translation.py` 2/2；标准主题硬编码列 |
| 5 | seed-demo | **通（dev+数据源）** | `tests/test_report_dev_seed.py` 4/4；无 MySQL → partial |
| 6 | 模板查看页 | **断（FE 运行时）** | `ReportViewPage.tsx:139` 缺 `localizeTemplateReadiness` import → vitest 崩 |
| 7 | 真实 SMTP 投递 | **未 L1** | 仅 adapter 单测 + mock e2e；无 MailHog 工件 |
| 8 | 浏览器 60s 首导出 | **未验** | 无 browser-reviewer 截图 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T-A1 | 标准分析投递 e2e | PARTIAL | 7/B | CHAIN 绿；投递 mock 非真实 SMTP |
| T-A2 | 调度 list/executions 探针 | REAL | 8/B | pytest 探针 200 结构 |
| T-A3 | 模板 smoke | PARTIAL | 6/C | `report-templates` 绿；`ReportViewPage` 2 测失败 |
| T-A4 | 配置页投递 CTA | REAL | 8/B | `standard-analysis-config-cta.smoke` 绿 |
| T-B1 | 快照 retention | REAL | 9/A | retention pytest 2/2 |
| T-B2 | Dataset 主叙事 | REAL | 8/B | ConfigForm smoke + UI 文案 |
| T-B3 | 可观测条 | REAL | 8/B | `standard-analysis-observability.smoke` 绿 |
| T-C1 | 展示层码值翻译 | PARTIAL | 6/C | 单测绿；lifecycle/distribution 硬编码 binding |
| T-C2 | 导出翻译 | PARTIAL | 7/B | 共用 `label_translation`；空模板 export 422（今日修） |
| T-C3 | 模板首进 seed | PARTIAL | 6/C | dev_seed 绿；无浏览器 60s；无数据源 partial |

## 3d. 覆盖矩阵（必做 10 项）

| 实体 ID | 类型 | GATE | CHAIN | UI | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|------|---|---|------|------|
| T-A1 | 投递 e2e | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | `test_report_schedule_trust_chain.py` |
| T-A2 | 调度探针 | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | 同上 list/executions |
| T-A3 | 模板 smoke | ❌ | ✅ | ⚠️ | CHAIN | 2 | 1 | PARTIAL | templates 8/8；ViewPage 崩 |
| T-A4 | 配置 CTA | ❌ | ✅ | ✅ | UI | 2 | 2 | REAL | config-cta smoke |
| T-B1 | retention | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | REAL | `test_standard_snapshot_retention.py` |
| T-B2 | Dataset 叙事 | ❌ | ✅ | ✅ | UI | 2 | 2 | REAL | ConfigForm + MetaRow |
| T-B3 | 可观测条 | ❌ | ✅ | ✅ | UI | 2 | 2 | REAL | observability smoke |
| T-C1 | 码值翻译 | ❌ | ✅ | ❌ | CHAIN | 2 | 1 | PARTIAL | `test_report_label_translation.py` |
| T-C2 | 导出翻译 | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | 同上 + export 422 诚实 |
| T-C3 | 首进 seed | ❌ | ✅ | ⚠️ | CHAIN | 2 | 1 | PARTIAL | `test_report_dev_seed.py`；无 BROWSER |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | **10** |
| GATE only | **0** |
| CHAIN | **7** |
| UI / BROWSER | **3**（T-A4/B2/B3 UI smoke；无真机 BROWSER） |
| NONE（未验） | **0**（10 项均有 pytest/vitest 触达） |
| REAL 达标 | **5 / 10** |
| **逐一校验** | **是** — 10 项逐条对照 PRD + 测试输出 |
| 总体可否 REAL | **否** — 5 项 PARTIAL + 1 项 FE BROKEN 牵连 T-A3 |

## 3c. 五维评分汇总（范围级）

| ID | L | C | D | E | F | 总分 | 档位 | 真假 |
|----|---|---|---|---|---|------|------|------|
| M-RPT 必做 gate | 2 | 1 | 2 | 2 | 2 | **9→7** | B | **PARTIAL** |

扣分：`T-A3` FE 运行时错误；`T-C1/C3` 正确性/首进未浏览器验真；真实 SMTP 未 L1。

**打通但不对**（L≥2 且 C≤1）：T-A3（ViewPage 崩但仍标 smoke 部分绿）、T-C1（硬编码维表列）

## 4. 动态验证记录

| 步骤 | 操作 | 期望 | 实际 | 一致？ | 证据 |
|------|------|------|------|--------|------|
| 1 | `pytest` M-RPT 后端集 | 全绿 | **18 passed** | ✅ | 2026-08-20 13:49 跑数 |
| 2 | `vitest run fe/src/pages/admin/reports` | 全绿 | **85 passed, 3 failed** | ❌ | `ReportViewPage` `localizeTemplateReadiness is not defined` |
| 3 | `test_report_schedule_trust_chain` | 非 mock_succeeded | status ∈ failed/degraded | ✅ | mock dispatch only |
| 4 | 生产 seed-demo | 403 | 代码已门禁；未 browser | ✅ | `test_report_cr_truth_fixes.py` |
| 5 | 空模板 export | 422 | `RPT_ENGINE_EMPTY_TEMPLATE` | ✅ | 今日修复 + 单测 |

## 5. 修复文档

### T-A3 / B-ViewPage — 模板查看页运行时错误

**判定**：BROKEN（vitest Uncaught）  
**期望 vs 实际**：应渲染 readiness Badge；实际 `ReferenceError: localizeTemplateReadiness is not defined`  
**根因**：`fe/src/pages/admin/reports/ReportViewPage.tsx:139` 使用未 import 的函数（定义在 `ReportCenterTemplateTable.tsx` 或应抽至 shared）  
**修复方向**：从 `reportTemplateUi` 或 `ReportCenterTemplateTable` 导出并 import  
**修后验收**：`ReportViewPage.smoke.test.tsx` 全绿；T-A3 → REAL  
**优先级**：**P0**

### T-C1 — 标准分析码值翻译范围

**判定**：PARTIAL（C=1）  
**期望 vs 实际**：PRD 写「绑定维度字典字段自动 lookup」；实际 `label_translation.py` 对 lifecycle/distribution 硬编码 `dim`+`status/region`，忽略 `FieldMapping`  
**根因**：`backend/app/reports/label_translation.py` `_STANDARD_THEME_BINDINGS`  
**修复方向**：读 pack `FieldMapping`；未绑定列保持原值（已满足）  
**优先级**：P1

### T-C3 — 首进 60 秒导出

**判定**：PARTIAL（无 BROWSER L1）  
**期望 vs 实际**：PRD「60 秒内完成首次导出」；仅有 dev_seed pytest + FE smoke，**无** deploy-dev / browser 走查工件  
**修复方向**：`.dev` 环境 browser-reviewer 走查 seed→run→export 计时  
**优先级**：P1（验收举证）

### T-A1 — 真实 SMTP 投递

**判定**：PARTIAL（CHAIN with mock）  
**期望 vs 实际**：plan 写「MailHog/SMTP 下可完成一次定时投递」；CI 仅 mock `dispatch_artifact`  
**修复方向**：集成 smoke 打 MailHog 或登记 `evidence` smoke 工件  
**优先级**：P1（不阻塞 dev CHAIN）

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| P0 | T-A3 | `ReportViewPage` 缺 import → 模板查看页 smoke/运行崩 |
| P1 | T-C1 | 标准分析翻译硬编码列，非全 FieldMapping |
| P1 | T-C3 | 60s 首导出无浏览器证据 |
| P1 | T-A1 | 真实 SMTP 投递无集成 smoke |

## 7. 交接

- 建议：先修 P0 `ReportViewPage` import → 复跑 vitest；再 deploy-dev 走查 SMTP/首进
- 用户批准修复：**否**（本审计仅报告）

## 8. 对用户问题「功能全部打通了吗？」— 直接回答

| 口径 | 结论 |
|------|------|
| **M-RPT 必做 10 项（F-A～C）** | **主路径已 CHAIN 打通**（后端 18 测绿）；**不能标「全部 REAL」** — 5 项 PARTIAL、模板查看页 **BROKEN** |
| **PRD 勾选 vs 真通** | plan/PRD 已勾 F-A/B/C；truth 上 **缺 UI 全绿 + 真机 SMTP/60s 导出** |
| **F08 全模块 RPT-001～007** | 基线早已实现；**未**在本审计逐条重验全部 7 域 |
| **F-D 可选** | **未做**（交叉表、套打、另存为）— 不阻塞 gate |
| **生产端到端** | 需 MySQL sample + SMTP/IM 台账；无则 seed partial、投递 failed（诚实，非假绿） |

**一句话**：报表中心 **M-RPT 必做能力在开发/测试链路上基本打通**，但 **尚未「全部」真通** — 模板查看页有 P0 运行时错误，真实邮件投递与 60 秒首导出缺浏览器证据，F-D 可选未交付。

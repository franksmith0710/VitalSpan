# Feature Truth Audit: 报表中心 P3-SMOKE 最终形态

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-04 |
| 核验范围 | P3 Phase 1–5（元数据 DB · RenderSpec 真导出 · Dataset 桥接 · 调度模板附件 · 文档/手测） |
| 锚点 | `reports/persistence/` · `reports/render/` · `engine/execute.py` · `scheduler/executor.py` |
| 总体判定 | **REAL** |
| **总分 / 档位** | **8.6 / 10 · B+** |
| 状态 | approved |
| **sampling** | `full`（P3-T1…T16 + 原 m10/m9 回归子集） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| P3-T1 | `RPT_METADATA_STORE=db` catalog CRUD 重启可读 | Phase 1 |
| P3-T2 | extension/prefab/templates 迁离模块级 dict | Phase 1 |
| P3-T3 | migration 0034 `report_*` 表 | Phase 1 |
| P3-T4 | PDF 以 `%PDF` 含真实 section rows | Phase 2 |
| P3-T5 | Excel/Word PK zip 非 label 占位 | Phase 2 |
| P3-T6 | IF-03 export 走 `export_template_bytes` | Phase 2 |
| P3-T7 | 调度 template 附件 `artifactKind=template_render` | Phase 2 |
| P3-T8 | metric `queryMode=dataset` → rows | Phase 3 |
| P3-T9 | FE TemplateDetailPanel SQL/Dataset 切换 | Phase 3 |
| P3-T10 | web 模板 run pdf → 422 | Phase 2 守卫 |
| P3-T11 | staging env 示例 `RPT_*_STORE=db` | Phase 4 |
| P3-T12 | `test_template_schedule_smtp_pdf_attachment` | Phase 4 |
| P3-T13 | `DashboardEditPage` 定时推送 smoke | Phase 4 |
| P3-T14 | live MailHog integration（可选 skip） | Phase 4 |
| P3-T15 | 手测 Case 19/20 文档 | Phase 5 |
| P3-T16 | services/prd/api 同步 | Phase 5 |

## 2. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| P3-T1 | 元数据 DB 持久化 | REAL | 9/A | `test_report_metadata_db_store.py` passed |
| P3-T2 | repo 抽象 | REAL | 9/A | `persistence/store.py` + service 无 `_nodes` 直写 |
| P3-T3 | migration | REAL | 8/B | `0034_report_metadata_persistence.py` |
| P3-T4 | PDF 真渲染 | REAL | 9/A | reportlab + `test_report_template_real_export.py` |
| P3-T5 | Excel/Word | REAL | 8/B | openpyxl + OOXML zip |
| P3-T6 | IF-03 接线 | REAL | 8/B | `integration/reports_export.py` |
| P3-T7 | 调度模板附件 | REAL | 9/A | `test_template_schedule_smtp_pdf_attachment` |
| P3-T8 | Dataset execute | REAL | 8/B | `test_report_engine_dataset_bridge.py` |
| P3-T9 | FE Dataset UI | PARTIAL | 7/B | Badge/模式切换；完整 DatasetBindPanel 复用留 companion |
| P3-T10 | format 守卫 | REAL | 8/B | `engine/service.py` export kind 校验 |
| P3-T11 | staging env | REAL | 8/B | `backend/.env.example` |
| P3-T12 | pytest 调度 SMTP | REAL | 9/A | mock SMTP PDF attach |
| P3-T13 | EditPage smoke | REAL | 8/B | vitest + TooltipProvider |
| P3-T14 | live MailHog | UNVERIFIED | 6/C | `test_template_schedule_smtp_live` skip 当环境不可达 |
| P3-T15 | 手测 Case | REAL | 8/B | `report-center-manual-test-cases.md` Case 19/20 |
| P3-T16 | 文档 | REAL | 8/B | `reports.md` · `F08-RPT.md` · `api/README.md` |

## 3. 与 G5 ToB 审计对比

| 项 | G5 ToB (6.8 PARTIAL) | P3 (8.6 REAL) |
|----|----------------------|---------------|
| 元数据持久化 | memory 默认 | `RPT_METADATA_STORE` db 路径 + 测试 |
| 模板导出 | mock/占位 | RenderSpec 真字节 |
| Dataset | 仅 SQL | sql + dataset 双路径 |
| 调度模板附件 | 看板 PDF 为主 | template_render PDF 附件 |
| Live 签收 | FE skip | integration 可选 + mock 覆盖 |

## 4. 残余风险（非阻塞）

- Jasper 级 WYSIWYG 设计器未纳入（ADR-09 companion）
- FE Dataset 选择器为轻量切换，未完整复用 `DatasetBindPanel`
- Live MailHog/Playwright 依赖本地 staging 栈，CI 默认 skip
- 组合调度粒度、catalog 另存为/手工执行留远期

## 5. 结论

P3-SMOKE 交付档位达成：**元数据可 DB 持久化、模板可真导出、extension 可 Dataset 查数、调度可附带真 PDF**。总分 **8.6 REAL**，可签收生产 smoke 路径；Live 全栈验收建议在 staging 按 Case 18/19 复跑。

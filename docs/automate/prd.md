# VitalSpan — 产品需求文档（PRD · Hub）

```yaml
version: 1.2.66
last_updated: 2026-07-04
truth_source: true
evolution_hub: true
goal_ref: docs/automate/goal.md
features_ref: docs/automate/prd/
scoring_ref: .cursor/automate/skills/prd-scoring/SKILL.md
feature_count: 124
domain_count: 16
```

> **本文件是索引层（hub）**：8 维评分、薄弱项汇总、功能索引**仅在本文件**维护。
> 验收标准、代码锚点、逐条说明在 [`prd/`](./prd/) 分片（**16 域 · 124 项**），按 ID 按需加载。

## 系统薄弱项汇总（按总分升序，供选题）

> 更新：2026-07-04 · P5 r64 重评 NFR-001 + CAT-001 + NFR-004 + CAT-002 + CAT-007（跨域 NFR/CAT 远期 stub L1 + CAT-007 companion r64）；pytest 1687/4 skipped；test_nfr_cat_r64 33/33 + test_viz_view_design_cat_r63 32/32 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 163/163；dashboard-first-screen probe、lifecycle/aggregate 模板、https-audit mask-probe、workno scope ACL + perf probe；完整度 5%→76%、可靠性 0%→94%、测试覆盖 0%→98%，CAT-007 性能 58%→88%、完整度 76%→90%；总分 13.1–13.9→83.9–84.2（四 stub <90 STUCK upsert round 1）、CAT-007 83.3→90.2 STUCK 清零；fe 首屏/IF-02 查询/生产 TLS/真实审计 store 留 companion）

| 排名 | ID | 功能 | 总分 | 最薄弱维度 | 建议优先级 |
|------|-----|------|------|------------|------------|
| 1 | CAT-003 | 分类项 | 83.9 | 性能 | 见期次 |
| 2 | CAT-006 | 分类项 | 83.9 | 性能 | 见期次 |
| 3 | CAT-004 | 分类项 | 83.9 | 性能 | 见期次 |
| 4 | RPT-002 | 报表项 | 84.0 | 性能 | 见期次 |
| 5 | META-005 | 元数据项 | 84.0 | 性能 | 见期次 |
| 6 | DASH-005 | 仪表板项 | 84.0 | 性能 | 见期次 |
| 7 | CAT-001 | 分类项 | 83.9 | 性能 | 见期次 |
| 8 | CAT-002 | 分类项 | 83.9 | 性能 | 见期次 |
| 9 | NFR-001 | 非功能项 | 84.2 | 性能 | 见期次 |
| 10 | NFR-004 | 非功能项 | 84.2 | 性能 | 见期次 |

---

## 功能项 8 维评分总表

> 各列存**维度分%**；末列加权总分（高×3/中×2）。完整 118 行 — 详见分片。

| ID | 用户价值 | 完整度 | 可靠性 | 交互体验 | 架构健康 | 测试覆盖 | 性能 | 安全性 | 加权总分 | 薄弱项 |
|----|:--------:|:------:|:------:|:--------:|:--------:|:--------:|:----:|:------:|:--------:|--------|
| BOOT-001 | 84 | 98 | 92 | N/A | 88 | 98 | 88 | 88 | 91.0 | 用户价值 |
| BOOT-002 | 84 | 96 | 88 | 94 | 92 | 98 | 88 | 88 | 90.7 | 安全性 |
| BOOT-003 | 84 | 100 | 90 | N/A | 88 | 98 | 86 | 90 | 90.9 | 用户价值 |
| BOOT-004 | 84 | 98 | 92 | N/A | 90 | 98 | 88 | 88 | 91.2 | 用户价值 |
| BOOT-005 | 84 | 96 | 90 | N/A | 88 | 100 | 88 | 90 | 90.7 | 用户价值 |
| BOOT-006 | 84 | 96 | 92 | N/A | 90 | 100 | 88 | 90 | 91.3 | 用户价值 |
| AUTH-001 | 82 | 98 | 98 | N/A | 90 | 100 | 86 | 88 | 91.9 | 用户价值 |
| AUTH-002 | 84 | 98 | 96 | N/A | 90 | 100 | 86 | 88 | 92.1 | 用户价值 |
| AUTH-003 | 84 | 98 | 96 | N/A | 90 | 100 | 86 | 90 | 92.1 | 用户价值 |
| AUTH-004 | 84 | 98 | 96 | N/A | 90 | 100 | 86 | 90 | 92.1 | 用户价值 |
| AUTH-005 | 82 | 96 | 96 | N/A | 90 | 100 | 88 | 90 | 91.6 | 用户价值 |
| AUTH-006 | 82 | 96 | 94 | N/A | 90 | 100 | 86 | 88 | 90.8 | 用户价值 |
| AUTH-007 | 82 | 96 | 94 | N/A | 90 | 100 | 86 | 90 | 91.1 | 用户价值 |
| AUTH-008 | 84 | 96 | 94 | N/A | 90 | 100 | 90 | 92 | 92.1 | 用户价值 |
| DS-001 | 82 | 94 | 94 | N/A | 94 | 100 | 86 | 88 | 90.9 | 用户价值 |
| DS-002 | 84 | 98 | 96 | N/A | 90 | 100 | 86 | 90 | 92.1 | 用户价值 |
| DS-003 | 84 | 94 | 98 | N/A | 90 | 100 | 86 | 90 | 91.8 | 用户价值 |
| DS-004 | 82 | 94 | 94 | N/A | 90 | 100 | 86 | 90 | 90.7 | 用户价值 |
| DS-005 | 82 | 96 | 96 | N/A | 90 | 100 | 86 | 96 | 92.1 | 用户价值 |
| DS-006 | 82 | 96 | 96 | N/A | 92 | 100 | 88 | 88 | 91.6 | 用户价值 |
| DS-007 | 84 | 96 | 94 | N/A | 90 | 100 | 86 | 88 | 91.2 | 用户价值 |
| DS-008 | 84 | 94 | 96 | N/A | 90 | 100 | 86 | 92 | 91.6 | 用户价值 |
| CONN-001 | 82 | 92 | 94 | N/A | 90 | 100 | 86 | 88 | 90.1 | 用户价值 |
| CONN-002 | 82 | 92 | 94 | N/A | 90 | 100 | 86 | 88 | 90.1 | 用户价值 |
| CONN-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CONN-004 | 84 | 88 | 94 | N/A | 90 | 98 | 88 | 90 | 90.0 | 用户价值 |
| CONN-005 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 92 | 90.6 | 用户价值 |
| CONN-006 | 84 | 90 | 94 | N/A | 90 | 100 | 88 | 90 | 90.6 | 用户价值 |
| CONN-007 | 84 | 90 | 96 | N/A | 90 | 100 | 92 | 88 | 91.2 | 安全性 |
| CONN-008 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.4 | 用户价值 |
| CONN-009 | 84 | 88 | 96 | N/A | 90 | 98 | 90 | 88 | 90.4 | 用户价值 |
| CONN-010 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| CONN-011 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CONN-012 | 84 | 88 | 94 | N/A | 90 | 100 | 88 | 88 | 90.0 | 用户价值 |
| CONN-013 | 84 | 90 | 96 | N/A | 92 | 100 | 88 | 90 | 91.2 | 用户价值 |
| CONN-014 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CONN-015 | 84 | 90 | 96 | N/A | 90 | 100 | 88 | 90 | 91.0 | 用户价值 |
| CONN-016 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| CONN-017 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 性能 |
| CONN-018 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| CONN-019 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| CONN-020 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| CONN-021 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CONN-022 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| QUERY-001 | 86 | 96 | 96 | N/A | 90 | 100 | 90 | 92 | 92.8 | 架构健康 |
| QUERY-002 | 86 | 96 | 96 | N/A | 90 | 100 | 90 | 88 | 92.4 | 安全性 |
| QUERY-003 | 84 | 90 | 96 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| QUERY-004 | 82 | 94 | 94 | N/A | 92 | 100 | 90 | 90 | 91.4 | 用户价值 |
| QUERY-005 | 84 | 98 | 96 | N/A | 90 | 100 | 90 | 90 | 92.6 | 用户价值 |
| QUERY-006 | 86 | 96 | 96 | N/A | 90 | 100 | 86 | 94 | 92.6 | 性能 |
| QUERY-007 | 84 | 94 | 96 | N/A | 92 | 98 | 90 | 88 | 91.7 | 安全性 |
| QUERY-008 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 性能 |
| QUERY-009 | 84 | 88 | 94 | N/A | 90 | 98 | 88 | 90 | 90.0 | 用户价值 |
| VIZ-001 | 84 | 98 | 96 | N/A | 90 | 100 | 88 | 90 | 92.4 | 用户价值 |
| VIZ-002 | 84 | 96 | 94 | N/A | 90 | 100 | 88 | 90 | 91.6 | 用户价值 |
| VIZ-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| VIZ-004 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| VIZ-005 | 84 | 88 | 96 | N/A | 90 | 98 | 88 | 88 | 90.0 | 用户价值 |
| VIZ-006 | 84 | 90 | 94 | N/A | 88 | 98 | 86 | 90 | 90.2 | 性能 |
| VIZ-007 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 90 | 90.1 | 用户价值 |
| VIZ-008 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| DASH-001 | 84 | 98 | 96 | N/A | 90 | 100 | 88 | 90 | 92.4 | 用户价值 |
| DASH-002 | 84 | 92 | 94 | N/A | 90 | 100 | 88 | 88 | 90.7 | 用户价值 |
| DASH-003 | 84 | 94 | 94 | N/A | 88 | 100 | 88 | 88 | 90.7 | 用户价值 |
| DASH-004 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| DASH-005 | 84 | 74 | 94 | N/A | 90 | 98 | 58 | 90 | 84.0 | 性能 |
| DASH-006 | 84 | 90 | 96 | N/A | 90 | 100 | 90 | 90 | 91.2 | 用户价值 |
| RPT-001 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| RPT-002 | 84 | 76 | 94 | N/A | 90 | 96 | 58 | 88 | 84.0 | 性能 |
| RPT-003 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| RPT-004 | 86 | 90 | 96 | N/A | 90 | 100 | 88 | 90 | 91.3 | 性能 |
| RPT-005 | 86 | 90 | 96 | N/A | 90 | 100 | 90 | 90 | 91.5 | 用户价值 |
| RPT-006 | 86 | 90 | 94 | N/A | 88 | 100 | 90 | 90 | 90.9 | 用户价值 |
| RPT-007 | 86 | 90 | 96 | N/A | 90 | 100 | 90 | 92 | 91.8 | 用户价值 |
| VIEW-001 | 82 | 94 | 94 | N/A | 90 | 96 | 88 | 88 | 90.2 | 用户价值 |
| VIEW-002 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 90 | 90.1 | 用户价值 |
| VIEW-003 | 84 | 90 | 94 | N/A | 90 | 100 | 88 | 92 | 90.8 | 用户价值 |
| GOV-001 | 82 | 92 | 92 | N/A | 90 | 96 | 86 | 88 | 90.2 | 用户价值 |
| GOV-002 | 82 | 92 | 94 | N/A | 88 | 96 | 86 | 90 | 90.4 | 性能 |
| GOV-003 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| GOV-004 | 84 | 90 | 96 | N/A | 90 | 98 | 88 | 88 | 90.5 | 用户价值 |
| GOV-005 | 84 | 90 | 96 | N/A | 88 | 98 | 88 | 88 | 90.2 | 架构健康 |
| GOV-006 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| GOV-007 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 90 | 84.4 | 性能 |
| GOV-008 | 84 | 88 | 94 | N/A | 90 | 98 | 88 | 92 | 90.2 | 用户价值 |
| META-001 | 82 | 92 | 92 | N/A | 90 | 98 | 90 | 88 | 90.0 | 安全性 |
| META-002 | 84 | 94 | 94 | N/A | 90 | 98 | 90 | 88 | 91.1 | 安全性 |
| META-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| META-004 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| META-005 | 84 | 76 | 94 | N/A | 88 | 96 | 58 | 90 | 84.0 | 性能 |
| META-006 | 84 | 90 | 94 | N/A | 90 | 100 | 88 | 88 | 90.4 | 用户价值 |
| DESIGN-001 | 82 | 92 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| DESIGN-002 | 82 | 90 | 96 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| DESIGN-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.2 | 用户价值 |
| DESIGN-004 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 92 | 90.4 | 用户价值 |
| DESIGN-005 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| API-001 | 82 | 90 | 90 | N/A | 90 | 96 | 86 | 88 | 90.0 | 性能 |
| API-002 | 82 | 90 | 92 | N/A | 88 | 96 | 86 | 88 | 90.2 | 性能 |
| API-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| API-004 | 84 | 90 | 96 | N/A | 90 | 98 | 88 | 90 | 90.7 | 用户价值 |
| API-005 | 84 | 88 | 94 | N/A | 90 | 98 | 88 | 92 | 90.2 | 用户价值 |
| API-006 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 92 | 90.6 | 用户价值 |
| API-007 | 84 | 90 | 94 | N/A | 92 | 100 | 88 | 90 | 90.8 | 用户价值 |
| CAT-001 | 84 | 76 | 94 | N/A | 88 | 98 | 58 | 88 | 83.9 | 性能 |
| CAT-002 | 84 | 76 | 94 | N/A | 88 | 98 | 58 | 88 | 83.9 | 性能 |
| CAT-003 | 84 | 76 | 94 | N/A | 88 | 96 | 58 | 88 | 83.9 | 性能 |
| CAT-004 | 84 | 76 | 94 | N/A | 88 | 98 | 58 | 88 | 83.9 | 性能 |
| CAT-005 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 92 | 90.4 | 用户价值 |
| CAT-006 | 84 | 76 | 94 | N/A | 88 | 98 | 58 | 88 | 83.9 | 性能 |
| CAT-007 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 90 | 90.2 | 用户价值 |
| NFR-001 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| NFR-002 | 84 | 76 | 94 | N/A | 90 | 98 | 58 | 88 | 84.2 | 性能 |
| NFR-003 | 84 | 76 | 94 | N/A | 90 | 96 | 58 | 90 | 84.2 | 性能 |
| NFR-004 | 84 | 76 | 94 | N/A | 88 | 98 | 58 | 90 | 84.2 | 性能 |
| NFR-005 | 82 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.0 | 用户价值 |
| NFR-006 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| NFR-007 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| NFR-008 | 86 | 90 | 96 | N/A | 90 | 98 | 88 | 92 | 91.3 | 用户价值 |
| DATA-004 | 80 | 96 | 95 | N/A | 88 | 100 | 86 | 94 | 91.1 | 用户价值 |
| DATA-001 | 82 | 96 | 94 | N/A | 88 | 100 | 88 | 92 | 91.3 | 用户价值 |
| DATA-002 | 84 | 94 | 96 | N/A | 86 | 100 | 90 | 86 | 91.0 | 用户价值 |
| ETL-001 | 84 | 96 | 94 | N/A | 88 | 100 | 88 | 90 | 91.4 | 用户价值 |
| DATA-003 | 84 | 96 | 92 | 95 | 87 | 100 | 88 | 90 | 91.5 | 用户价值 |
| DATA-005 | 82 | 98 | 92 | N/A | 88 | 100 | 88 | 88 | 90.8 | 用户价值 |

---

## 功能索引（明细见 `prd/` 分片）

> **G2 选题**：只读本文件（hub），**禁止加载分片**。
> **P1 / P3 / P5**：按入选 ID 只读对应分片单文件。

| 分片 | 功能 ID 域 | 明细路径 |
|------|------------|----------|
| F01-BOOT.md | BOOT-001 ~ BOOT-006 | `prd/F01-BOOT.md` |
| F02-AUTH.md | AUTH-001 ~ AUTH-008 | `prd/F02-AUTH.md` |
| F03-DS.md | DS-001 ~ DS-008 | `prd/F03-DS.md` |
| F04-CONN.md | CONN-001 ~ CONN-022 | `prd/F04-CONN.md` |
| F05-QUERY.md | QUERY-001 ~ QUERY-009 | `prd/F05-QUERY.md` |
| F06-VIZ.md | VIZ-001 ~ VIZ-008 | `prd/F06-VIZ.md` |
| F07-DASH.md | DASH-001 ~ DASH-006 | `prd/F07-DASH.md` |
| F08-RPT.md | RPT-001 ~ RPT-007 | `prd/F08-RPT.md` |
| F09-VIEW.md | VIEW-001 ~ VIEW-003 | `prd/F09-VIEW.md` |
| F10-GOV.md | GOV-001 ~ GOV-008 | `prd/F10-GOV.md` |
| F11-META.md | META-001 ~ META-006 | `prd/F11-META.md` |
| F12-DESIGN.md | DESIGN-001 ~ DESIGN-005 | `prd/F12-DESIGN.md` |
| F13-API.md | API-001 ~ API-007 | `prd/F13-API.md` |
| F14-CAT.md | CAT-001 ~ CAT-007 | `prd/F14-CAT.md` |
| F15-NFR.md | NFR-001 ~ NFR-008 | `prd/F15-NFR.md` |
| F16-DATA.md | DATA-004 ~ DATA-005 · ETL-001 | `prd/F16-DATA.md` |

---

## 里程碑

- **归档**：[`plan.archive.md`](./plan.archive.md)（M1–M13，118 项 PRD 全量映射）
- **活跃**：[`plan.md`](./plan.md)（当前节 **M1**，`create-evolution-plan` 人工维护）

---

## 修订记录（最近 10 条）

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.2.66 | 2026-07-04 | P5 r64 重评 NFR-001 + CAT-001 + NFR-004 + CAT-002 + CAT-007（跨域 NFR/CAT 远期 stub L1 + CAT-007 companion r64）；pytest 1687/4 skipped；test_nfr_cat_r64 33/33 + test_viz_view_design_cat_r63 32/32 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 163/163；dashboard-first-screen、lifecycle/aggregate 模板、https-audit mask-probe、workno scope ACL + perf probe；完整度 5%→76%，可靠性 0%→94%，测试覆盖 0%→98%，CAT-007 性能 58%→88%、完整度 76%→90%；总分 13.1–13.9→83.9–84.2（四 stub <90 STUCK upsert round 1）、CAT-007 83.3→90.2 STUCK 清零；fe 首屏/IF-02 查询/生产 TLS/真实审计 store 留 companion） |
| 1.2.65 | 2026-07-04 | P5 r63 重评 VIZ-007 + VIEW-002 + DESIGN-004 + CAT-005 + VIEW-003（跨域 companion 质量推分 r63）；pytest 1654/4 skipped；test_viz_view_design_cat_r63 32/32 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 130/130；sdk portal probe/ACL、role default bounds、workflow-link catalog guard、ticket stats ACL、me/views GET/404/cycle probe；性能 58%→88%，完整度 74–76%→90%，总分 82.9–84.2→90.1–90.8（五 ID 破 90 STUCK 清零；fe SDK/工单表绑定/GOV-005 全链路/M7 RLS fe 留 companion） |
| 1.2.64 | 2026-07-04 | P5 r62 重评 CAT-006 + NFR-003 + RPT-002 + RPT-003 + META-005（跨域远期 stub L1 kickoff r62）；pytest 1622/4 skipped；test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 + test_meta_cat_dash_conn_design_r59 34/34 回归 132/132；production stats、dashboard SLA probe/alerts、prefab bindings、template blocks、physical table register；完整度 5%→76%，可靠性 0%→94%，测试覆盖 0%→96–98%，总分 12.1–13.1→83.9–84.2（五 ID 均 <90 STUCK upsert round 1；fe 统计页/真实 SLA metrics/PDF 渲染/FR-6.2 lineage 留 companion） |
| 1.2.63 | 2026-07-04 | P5 r61 重评 CAT-005 + DASH-004 + VIZ-007 + NFR-002 + CAT-003（跨域远期 stub L1 kickoff r61）；pytest 1590/4 skipped；test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 + test_meta_cat_dash_conn_design_r59 34/34 + test_dash_rpt_r58 38/38 回归 138/138；ticket stats、global_filter_linkage config_store、sdk portal lifecycle、report-perf mock probe、geo region 树；完整度 5%→74–76%，可靠性 0%→92–94%，测试覆盖 0%→96–98%，总分 12.1–12.6→82.9–84.2（五 ID 均 <90 STUCK upsert round 1；fe 筛选器/SDK/工单表 ACL/M7 地域权限/真实 perf suite 留 companion） |
| 1.2.62 | 2026-07-04 | P5 r60 重评 RPT-001 + VIEW-002 + VIEW-003 + CAT-007 + GOV-007（跨域远期 stub L1 kickoff r60）；pytest 1558/4 skipped；test_rpt_view_cat_gov_r60 34/34 + test_dash_rpt_r58 38/38 + test_meta_cat_dash_conn_design_r59 34/34 + test_view_gov_api_r31 24/24 回归 130/130；reports engine run、role default-views、user me/views bounds、workno behavior、gov bus auto-register FSM；完整度 5%→74–76%，可靠性 0%→92–94%，测试覆盖 0%→96–98%，总分 12.2–12.4→82.9–84.4（五 ID 均 <90 STUCK upsert round 1；M3-LITE/PDF/fe 视图 UI/真实审计/总线 HTTP 留 companion） |
| 1.2.61 | 2026-07-04 | P5 r59 重评 META-004 + CAT-004 + DASH-005 + CONN-018 + DESIGN-004（跨域远期薄弱项 L1 kickoff r59）；pytest 1524/4 skipped；test_meta_cat_dash_conn_design_r59 34/34 + test_dash_rpt_r58 38/38 + test_dash_rpt_query_nfr_r57 37/37 回归 109/109；dataset validate+CRUD、classification 树 CRUD/move、entity_overview config_store、kingbase PG 委托+HTTP 链、designer workflow-link publishReady；完整度 5%→74–76%，可靠性 0%→92–94%，测试覆盖 0%→96–98%，总分 12.0–12.1→82.9–84.2（五 ID 均 <90 STUCK upsert round 1；fe 页面/timeseries 模板/只读查询集成测/GOV-005 全链路留 companion） |
| 1.2.60 | 2026-07-04 | P5 r58 重评 DASH-006 + RPT-004/005/006/007（M9/M10/M12 仪表板与报表 companion 质量推分 r58）；pytest 1490/4 skipped；test_dash_rpt_r58 38/38 + r57 37/37 + r55 35/35 + r53 38/38 + r52 52/52 回归 200/200；theme execute-plan 四步链 + yoy/mom compareWindow + theme ACL、reports compare-preview/render-spec compareMetrics + extension ACL、semi-real 调度 + mock 投递链 + revisionSnapshot + artifact 访问守卫；完整度 84–88%→90%，安全性 86%→90–92%，总分 88.2–90.4→90.9–91.8（DASH-006/RPT-004/005 STUCK 清零破 90；GIS/fe/真实 SMTP/对象存储/管理员 UI 留远期） |
| 1.2.59 | 2026-07-04 | P5 r57 重评 QUERY-009 + RPT-004/005 + DASH-006 + NFR-008（M9 主题分析 + M10/M12 报表 + M13 Dataset/NFR companion 质量推分 r57）；pytest 1452/4 skipped；test_dash_rpt_query_nfr_r57 37/37 + r53 38/38 + r55 35/35 + r52 52/52 回归 162/162；dataset execute-plan、chart-bindings linkage、catalog M7 ACL、mock schedule executor、deployment-report；性能 58%→88%，完整度 72–78%→84–90%，总分 82.6–85.6→88.2–91.3（QUERY-009/NFR-008 破 90 STUCK 清零；DASH-006/RPT-004/005 仍 <90 STUCK round 2；同比环比/GIS/fe/真实执行器/产物投递留远期） |
| 1.2.58 | 2026-07-04 | P5 r55 重评 RPT-006/007 + GOV-006 + META-006 + CONN-020（M10/M12 报表扩展 + M8 OpenAPI + META schema + OceanBase companion 质量推分 r55）；pytest 1415/4 skipped；test_rpt_gov_meta_conn_r55 35/35 + r54 42/42 + r53 38/38 + r52 52/52 回归 167/167；gov openapi 版本/deactivate、batch 部分失败 detail、extension render-spec/revisions/snapshot、entity validate/query-bindings、oceanbase HTTP 4xx/502+limit；性能 58%→88%，完整度 74–78%→90%，总分 88.4–89.9→90.0–90.4（五 ID 破 90 STUCK 清零；管理员 UI/真实持久化/只读查询集成测/OpenAPI 文档生成留远期） |
| 1.2.57 | 2026-07-04 | P5 r54 重评 RPT-006/007 + GOV-006 + META-006 + CONN-020（M10/M12 报表扩展 + M8 发布引擎 OpenAPI + 实体 schema + OceanBase L1 kickoff r54）；pytest 1380/4 skipped；test_rpt_gov_meta_conn_r54 42/42 + r53 38/38 + r52 52/52 + r49 35/35 + r46 36/36 回归 203/203；reports extension/batch、gov openapi-mappings、metadata entity schema、oceanbase dialect；完整度 5%→74–78%，可靠性 0%→94–96%，测试覆盖 0%→98%，总分 11.8–12.0→88.4–89.9（五 ID 均 <90 STUCK upsert round 1；渲染联动/持久化/UI/只读查询集成测留 companion） |

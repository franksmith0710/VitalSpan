# VitalSpan — 产品需求文档（PRD · Hub）

```yaml
version: 1.2.70
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

> 更新：2026-07-04 · P5 r68 重评 NFR-003 + NFR-004 + GOV-007 + RPT-002 + VIEW-002（跨域 companion 质量推分 r68）；pytest 1821/4 skipped；test_nfr_gov_rpt_view_r68 35/35 + test_dash_nfr_conn_rpt_r67 34/34 + test_cat_dash_rpt_meta_r66 33/33 + test_cat_rpt_meta_r65 32/32 + test_nfr_cat_r64 33/33 + test_cat_nfr_rpt_meta_r62 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 233/233；dashboard SLA/https-audit enterprise ACL、auto-register FSM/path scope、prefab GET/duplicate guard、role default cycle/scope + 各域 probe ≤50ms；性能 58%→88%，完整度 76%→90%，总分 84.2–90.1→90.0–90.4（五 ID 破 90 STUCK 清零；fe 统计页/生产 TLS/真实总线 HTTP/fe 预制报表 UI 留 companion）

| 排名 | ID | 功能 | 总分 | 最薄弱维度 | 建议优先级 |
|------|-----|------|------|------------|------------|
| 1 | CAT-001 | 分类项 | 90.0 | 用户价值 | 见期次 |
| 2 | CAT-002 | 分类项 | 90.0 | 用户价值 | 见期次 |
| 3 | CONN-004 | 连接器项 | 90.0 | 用户价值 | 见期次 |
| 4 | DASH-004 | 仪表板项 | 90.0 | 用户价值 | 见期次 |
| 5 | NFR-001 | 非功能项 | 90.0 | 用户价值 | 见期次 |
| 6 | QUERY-009 | 查询项 | 90.0 | 用户价值 | 见期次 |
| 7 | VIZ-005 | 可视化项 | 90.0 | 用户价值 | 见期次 |
| 8 | META-001 | 元数据项 | 90.0 | 安全性 | 见期次 |
| 9 | API-001 | 集成项 | 90.0 | 性能 | 见期次 |
| 10 | NFR-002 | 非功能项 | 90.1 | 用户价值 | 见期次 |

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
| CONN-018 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.0 | 用户价值 |
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
| DASH-004 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.0 | 用户价值 |
| DASH-005 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| DASH-006 | 84 | 90 | 96 | N/A | 90 | 100 | 90 | 90 | 91.2 | 用户价值 |
| RPT-001 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.2 | 用户价值 |
| RPT-002 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| RPT-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.2 | 用户价值 |
| RPT-004 | 86 | 90 | 96 | N/A | 90 | 100 | 88 | 90 | 91.3 | 性能 |
| RPT-005 | 86 | 90 | 96 | N/A | 90 | 100 | 90 | 90 | 91.5 | 用户价值 |
| RPT-006 | 86 | 90 | 94 | N/A | 88 | 100 | 90 | 90 | 90.9 | 用户价值 |
| RPT-007 | 86 | 90 | 96 | N/A | 90 | 100 | 90 | 92 | 91.8 | 用户价值 |
| VIEW-001 | 82 | 94 | 94 | N/A | 90 | 96 | 88 | 88 | 90.2 | 用户价值 |
| VIEW-002 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.4 | 用户价值 |
| VIEW-003 | 84 | 90 | 94 | N/A | 90 | 100 | 88 | 92 | 90.8 | 用户价值 |
| GOV-001 | 82 | 92 | 92 | N/A | 90 | 96 | 86 | 88 | 90.2 | 用户价值 |
| GOV-002 | 82 | 92 | 94 | N/A | 88 | 96 | 86 | 90 | 90.4 | 性能 |
| GOV-003 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| GOV-004 | 84 | 90 | 96 | N/A | 90 | 98 | 88 | 88 | 90.5 | 用户价值 |
| GOV-005 | 84 | 90 | 96 | N/A | 88 | 98 | 88 | 88 | 90.2 | 架构健康 |
| GOV-006 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| GOV-007 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.2 | 用户价值 |
| GOV-008 | 84 | 88 | 94 | N/A | 90 | 98 | 88 | 92 | 90.2 | 用户价值 |
| META-001 | 82 | 92 | 92 | N/A | 90 | 98 | 90 | 88 | 90.0 | 安全性 |
| META-002 | 84 | 94 | 94 | N/A | 90 | 98 | 90 | 88 | 91.1 | 安全性 |
| META-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 性能 |
| META-004 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.2 | 用户价值 |
| META-005 | 84 | 90 | 94 | N/A | 88 | 96 | 88 | 90 | 90.5 | 用户价值 |
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
| CAT-001 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.0 | 用户价值 |
| CAT-002 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.0 | 用户价值 |
| CAT-003 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CAT-004 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CAT-005 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 92 | 90.4 | 用户价值 |
| CAT-006 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 88 | 90.1 | 用户价值 |
| CAT-007 | 84 | 90 | 94 | N/A | 88 | 98 | 88 | 90 | 90.2 | 用户价值 |
| NFR-001 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.0 | 用户价值 |
| NFR-002 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 88 | 90.1 | 用户价值 |
| NFR-003 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.2 | 用户价值 |
| NFR-004 | 84 | 90 | 94 | N/A | 90 | 98 | 88 | 90 | 90.2 | 用户价值 |
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
| 1.2.70 | 2026-07-04 | P5 r68 重评 NFR-003 + NFR-004 + GOV-007 + RPT-002 + VIEW-002（跨域 companion 质量推分 r68）；pytest 1821/4 skipped；test_nfr_gov_rpt_view_r68 35/35 + test_dash_nfr_conn_rpt_r67 34/34 + test_cat_dash_rpt_meta_r66 33/33 + test_cat_rpt_meta_r65 32/32 + test_nfr_cat_r64 33/33 + test_cat_nfr_rpt_meta_r62 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 233/233；dashboard SLA/https-audit enterprise ACL、auto-register FSM/path scope、prefab GET/duplicate guard、role default cycle/scope + 各域 probe ≤50ms；性能 58%→88%，完整度 76%→90%，总分 84.2–90.1→90.0–90.4（五 ID 破 90 STUCK 清零；fe 统计页/生产 TLS/真实总线 HTTP/fe 预制报表 UI 留 companion） |
| 1.2.69 | 2026-07-04 | P5 r67 重评 DASH-004 + NFR-001 + NFR-002 + CONN-018 + RPT-003（跨域 companion 质量推分 r67）；pytest 1786/4 skipped；test_dash_nfr_conn_rpt_r67 34/34 + test_cat_dash_rpt_meta_r66 33/33 + test_cat_rpt_meta_r65 32/32 + test_nfr_cat_r64 33/33 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_meta_cat_dash_conn_design_r59 34/34 回归 230/230；global_filter_linkage ACL/probe、dashboard-first-screen/report-perf ACL/probe、kingbase params/probe、template blocks ACL/probe + 各域 probe ≤50ms；性能 58%→88%，完整度 76%→90%，总分 84.2→90.0–90.2（五 ID 破 90 STUCK 清零；fe 筛选器/真实 perf suite/PDF 渲染/只读查询集成测留 companion） |
| 1.2.68 | 2026-07-04 | P5 r66 重评 CAT-001 + CAT-002 + DASH-005 + RPT-001 + META-004（跨域 companion 质量推分 r66）；pytest 1752/4 skipped；test_cat_dash_rpt_meta_r66 33/33 + test_cat_rpt_meta_r65 32/32 + test_nfr_cat_r64 33/33 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_meta_cat_dash_conn_design_r59 34/34 回归 196/196；lifecycle/aggregate scope ACL、entity_overview validate/drill、engine run ACL/__proto__ guard、dataset write ACL + 各域 probe ≤50ms；性能 58%→88%，完整度 74–76%→90%，总分 83.9–84.2→90.0–90.4（五 ID 破 90 STUCK 清零；IF-02 查询/fe 页面/M3-LITE/PDF/DE 对标留 companion） |
| 1.2.67 | 2026-07-04 | P5 r65 重评 CAT-003 + CAT-004 + CAT-006 + RPT-002 + META-005（跨域 companion 质量推分 r65）；pytest 1719/4 skipped；test_cat_rpt_meta_r65 32/32 + test_nfr_cat_r64 33/33 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_meta_cat_dash_conn_design_r59 34/34 回归 163/163；geo/classification scope ACL、production stats probe、prefab binding ACL、physical register ACL + 各域 probe ≤50ms；性能 58%→88%，完整度 76%→90%，总分 83.9–84.0→90.0–90.5（五 ID 破 90 STUCK 清零；M7 RLS/fe 页面/FR-6.2 lineage/真实数据源链留 companion） |
| 1.2.66 | 2026-07-04 | P5 r64 重评 NFR-001 + CAT-001 + NFR-004 + CAT-002 + CAT-007（跨域 NFR/CAT 远期 stub L1 + CAT-007 companion r64）；pytest 1687/4 skipped；test_nfr_cat_r64 33/33 + test_viz_view_design_cat_r63 32/32 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 163/163；dashboard-first-screen、lifecycle/aggregate 模板、https-audit mask-probe、workno scope ACL + perf probe；完整度 5%→76%，可靠性 0%→94%，测试覆盖 0%→98%，CAT-007 性能 58%→88%、完整度 76%→90%；总分 13.1–13.9→83.9–84.2（四 stub <90 STUCK upsert round 1）、CAT-007 83.3→90.2 STUCK 清零；fe 首屏/IF-02 查询/生产 TLS/真实审计 store 留 companion） |
| 1.2.65 | 2026-07-04 | P5 r63 重评 VIZ-007 + VIEW-002 + DESIGN-004 + CAT-005 + VIEW-003（跨域 companion 质量推分 r63）；pytest 1654/4 skipped；test_viz_view_design_cat_r63 32/32 + test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 回归 130/130；sdk portal probe/ACL、role default bounds、workflow-link catalog guard、ticket stats ACL、me/views GET/404/cycle probe；性能 58%→88%，完整度 74–76%→90%，总分 82.9–84.2→90.1–90.8（五 ID 破 90 STUCK 清零；fe SDK/工单表绑定/GOV-005 全链路/M7 RLS fe 留 companion） |
| 1.2.64 | 2026-07-04 | P5 r62 重评 CAT-006 + NFR-003 + RPT-002 + RPT-003 + META-005（跨域远期 stub L1 kickoff r62）；pytest 1622/4 skipped；test_cat_nfr_rpt_meta_r62 32/32 + test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 + test_meta_cat_dash_conn_design_r59 34/34 回归 132/132；production stats、dashboard SLA probe/alerts、prefab bindings、template blocks、physical table register；完整度 5%→76%，可靠性 0%→94%，测试覆盖 0%→96–98%，总分 12.1–13.1→83.9–84.2（五 ID 均 <90 STUCK upsert round 1；fe 统计页/真实 SLA metrics/PDF 渲染/FR-6.2 lineage 留 companion） |
| 1.2.63 | 2026-07-04 | P5 r61 重评 CAT-005 + DASH-004 + VIZ-007 + NFR-002 + CAT-003（跨域远期 stub L1 kickoff r61）；pytest 1590/4 skipped；test_cat_dash_viz_nfr_r61 32/32 + test_rpt_view_cat_gov_r60 34/34 + test_meta_cat_dash_conn_design_r59 34/34 + test_dash_rpt_r58 38/38 回归 138/138；ticket stats、global_filter_linkage config_store、sdk portal lifecycle、report-perf mock probe、geo region 树；完整度 5%→74–76%，可靠性 0%→92–94%，测试覆盖 0%→96–98%，总分 12.1–12.6→82.9–84.2（五 ID 均 <90 STUCK upsert round 1；fe 筛选器/SDK/工单表 ACL/M7 地域权限/真实 perf suite 留 companion） |
| 1.2.62 | 2026-07-04 | P5 r60 重评 RPT-001 + VIEW-002 + VIEW-003 + CAT-007 + GOV-007（跨域远期 stub L1 kickoff r60）；pytest 1558/4 skipped；test_rpt_view_cat_gov_r60 34/34 + test_dash_rpt_r58 38/38 + test_meta_cat_dash_conn_design_r59 34/34 + test_view_gov_api_r31 24/24 回归 130/130；reports engine run、role default-views、user me/views bounds、workno behavior、gov bus auto-register FSM；完整度 5%→74–76%，可靠性 0%→92–94%，测试覆盖 0%→96–98%，总分 12.2–12.4→82.9–84.4（五 ID 均 <90 STUCK upsert round 1；M3-LITE/PDF/fe 视图 UI/真实审计/总线 HTTP 留 companion） |

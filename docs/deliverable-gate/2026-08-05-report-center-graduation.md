# 产品可交付毕业判定 — 报表中心模块

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-05 |
| Skill | `~/.cursor/skills/product-deliverable-gate/` |
| Scope | **模块 · 报表中心**（`/admin/reports/*` + 关联 API） |
| Companion | **不含** plan F-D / PRD 演化建议 unchecked 项 |
| 判定 | **NO-GO** |
| 加权总分 | **7.3 / 10** |

---

## 0. 范围与假设

- **Intake**：dry-run · scope = 报表中心模块；PRD = F08-RPT RPT-001~007 + BOOT-002 报表菜单 + API-005 + NFR-002 + F09-VIEW 默认报表；plan = M9/M10/M12 报表行 + M-DEPTH F-E；companion 不含 F-D。
- **Truth 模式**：hybrid（读盘汇总，本回合未现跑 truth-verify）。
- **签字延期**：无。

---

## 1. 合同清单

| 合同 ID | 来源 | 描述摘要 | plan 分期 |
|---------|------|----------|-----------|
| RPT-001 | F08-RPT | 报表引擎渲染 · Web/PDF/Word companion | M9 · M-PRODUCT |
| RPT-002 | F08-RPT | 预制分析报表体系 | M9 |
| RPT-003 | F08-RPT | Word/Excel/PDF 模板定义 | M10 |
| RPT-004 | F08-RPT | 模板树形目录管理 | M10 |
| RPT-005 | F08-RPT | 报表调度 FR-3.2 · G5 可视化 PDF | M12 · M-DEPTH F-C |
| RPT-006 | F08-RPT | 报表扩展配置 | M10 |
| RPT-007 | F08-RPT | 批量新增报表 | M12 |
| BOOT-002 | F01-BOOT | 侧栏「报表」父菜单 + 子项 | M-FE |
| API-005 | F13-API | IF-03 报表文档 API | M12 |
| NFR-002 | F15-NFR | 报表查询性能 probe | M10 |
| VIEW-默认 | F09-VIEW | 角色默认报表模板 landing | M10 |
| RPT-004-D | F08-RPT | 另存为/手工执行 | companion · **DEFERRED** |
| RPT-005-D | F08-RPT | 组合调度粒度枚举 | companion · **DEFERRED** |

---

## 2. 完整度矩阵

| 合同 ID | 来源 | 状态 | plan 分期 | 证据摘要 | 备注 |
|---------|------|------|-----------|----------|------|
| RPT-001 | F08-RPT | IMPLEMENTED | M9 `[x]` | `engine/execute.py` · r233 pytest | |
| RPT-002 | F08-RPT | IMPLEMENTED | M9 `[x]` | `prefab/run.py` · smoke 4/4 | |
| RPT-003 | F08-RPT | IMPLEMENTED | M10 `[x]` | `ReportTemplatesPage` · r234 | WYSIWYG companion 非全量 |
| RPT-004 | F08-RPT | IMPLEMENTED | M10 `[x]` | `catalog/service.py` · r53/r58 | |
| RPT-005 | F08-RPT | IMPLEMENTED | M12 `[x]` | `scheduler/` · G5 2026-08-03 | 合同 [x]；truth 见张力 |
| RPT-006 | F08-RPT | IMPLEMENTED | M10 `[x]` | `extension/` · P3 db store | |
| RPT-007 | F08-RPT | IMPLEMENTED | M12 `[x]` | `batch/` · `BatchImportPanel` | truth T11 STUB |
| BOOT-002 | F01-BOOT | IMPLEMENTED | M-FE `[x]` | `nav-manifest.ts` · smoke | |
| API-005 | F13-API | IMPLEMENTED | M12 `[x]` | `ReportExportCard` · IF-03 | |
| NFR-002 | F15-NFR | IMPLEMENTED | M10 `[x]` | report-perf probe | |
| VIEW-默认 | F09-VIEW | IMPLEMENTED | M10 `[x]` | `defaultViewResolve.ts` 15/15 | |
| RPT-004-D | F08-RPT | DEFERRED | companion | PRD `[ ]` 标注非阻塞 | |
| RPT-005-D | F08-RPT | DEFERRED | companion | PRD `[ ]` 标注非阻塞 | |

### 2.1 统计

| 状态 | 数量 | 占比（scope 必做 11 项） |
|------|------|--------------------------|
| IMPLEMENTED | 11 | **100%** |
| PARTIAL | 0 | 0% |
| STUB | 0 | 0% |
| DEFERRED | 2 | companion，不纳入阻塞分母 |
| MISSING | 0 | 0% |
| DOC_ONLY | 0 | 0% |

**合同完整度分（0–10）**：**9.0** — scope 内必做 PRD+plan 全 `[x]`，代码锚点存在；2 项 companion 正确标 DEFERRED。

### 2.2 合同 vs Truth 张力

| 合同 ID | 合同状态 | Truth 判定 | 说明 |
|---------|----------|------------|------|
| RPT-005 | IMPLEMENTED | PARTIAL / BROKEN（G5） | PRD G5 `[x]`；G5 审计 G5-T6/T11 **BROKEN** |
| RPT-007 | IMPLEMENTED | STUB（T11） | 全模块审计：批量导入仅 JSON 校验 smoke |
| RPT-001~004 | IMPLEMENTED | REAL（消费/管理主路径） | 2026-07-31 T1–T8 多数 REAL |

---

## 3. Truth 汇总（hybrid）

| 路径 | 审计文档 | 日期 | 判定 | 分数 | GATE-only | 逐一校验 | 权威？ |
|------|----------|------|------|------|-----------|----------|--------|
| 全模块 | `2026-07-31-report-center-full-truth-audit.md` | 2026-07-31 | PARTIAL | 7.2/B | 1（T11） | **是** | 宽 scope 基线 |
| G5 交付 | `2026-08-03-report-center-g5-visual-pdf-truth-audit.md` | 2026-08-03 | PARTIAL | 5.8/C | — | 是（G5-T1~13） | **supersedes** delivery-recheck |
| P3 最终形态 | `2026-08-04-report-center-p3-truth-audit.md` | 2026-08-04 | **REAL** | 9.2/A | 0 | **是** | 窄 scope · 模板/持久化/导出链 |
| UX 可用性 | `2026-08-04-report-center-ux-truth-audit.md` | 2026-08-04 | PARTIAL | 7.2/B | — | 是 | 用户视角 |
| 消费路径（旧） | `2026-07-30-report-center-truth-audit.md` | 2026-07-30 | REAL | 9/A | 0 | 是 | 已被 full 取代 |

**Truth 汇总结论**：

- **消费 + 管理主路径**（Hub/View/模板/调度 UI）：REAL 达标（Jul 31 T1–T8）。
- **P3 签收链**（DB 持久化 · RenderSpec 真导出 · 模板调度 SMTP · live PDF pytest）：**REAL 9.2**（Aug 4）。
- **G5 看板/大屏定时 PDF + SMTP 附件 live 路径**：**PARTIAL 5.8**，G5-T6/G5-T11 **BROKEN**（Aug 3）— 与 P3「Case 18 可选不阻塞」并存 **张力**。
- **全模块宽 scope** 自 Jul 31 后 **未复验**；Aug 修复未回填 full 审计。

**Truth 可用性分（0–10）**：**7.0** — 主路径 REAL，但 delivery/G5 关键路径未 REAL；窄 scope REAL 不能覆盖宽 scope No-Go 条件。

### 3.1 待跑 truth-verify

| 路径 | 原因 | 建议命令 |
|------|------|----------|
| 报表中心 **全模块** 复验 | Jul 31 审计过期；P3/G5/UX 结论需合并为单一权威 full 报告 | `/feature-truth-verify 报表中心全模块，含 G5 live + T11 batch happy path，要 §3d` |
| G5 live 闭环 | Aug 3 P0 未关闭签收 | `/feature-truth-verify G5 看板定时 PDF + SMTP 附件 live 路径` |

---

## 4. Bug 与阻塞债

### 4.1 阻塞清单（P0 / 未签字 P1）

| ID | 优先级 | 来源 | 摘要 | 状态 | 解除条件 |
|----|--------|------|------|------|----------|
| G5-T6 | **P0** | `2026-08-03-report-center-g5-visual-pdf-truth-audit.md` | live Playwright 502；FE `/export` base path 不匹配 | **OPEN** | live `%PDF` + export-ready 时序 REAL |
| G5-T11 | **P0** | 同上 | SMTP 无 PDF 附件（仅文本+URL） | **OPEN** | MailHog/live 收到 `%PDF` 附件 |
| T9 | **P0** | `2026-07-31-report-center-full-truth-audit.md` | 看板定时 G5 附件非真实渲染（与 G5 审计同源） | **OPEN** | 与 G5-T6/T11 一并闭合 |
| T13 | P1 | Jul 31 full | SMTP 未配时投递降级 UX | OPEN | 环境文档 + FE 历史 errorMessage |
| T3 | P1 | Jul 31 full | 空库预制 run 依赖 dev seed | OPEN | 空态 FE 提示 + 默认 seed |
| T11 | P2 | Jul 31 full | 批量导入 happy path 未 L1 | OPEN | batch pytest + smoke |
| UX-T5 | P2 | Aug 4 UX | 模板扩展页无 SQL 表达式输入 | OPEN | 产品确认 + FE 字段 |

### 4.2 签字延期

无。

### 4.3 已闭合（scope 内，附录）

| ID | 来源 | 摘要 |
|----|------|------|
| ISSUE-001~015 | `2026-07-30-report-center-backlog.md` | UX critique 三轮修复全部 ✅ |
| P3-T1~T16 | `2026-08-04-report-center-p3-truth-audit.md` | P3 窄 scope 签收 REAL |

---

## 5. 毕业判定

| 维度 | 得分 | 权重 | 加权 |
|------|------|------|------|
| 合同完整度 | 9.0 | 30% | 2.70 |
| Truth 可用性 | 7.0 | 35% | 2.45 |
| Bug 清零度 | 5.0 | 25% | 1.25 |
| 可交付文档 | 8.5 | 10% | 0.85 |
| **合计** | — | — | **7.25 → 7.3 / 10** |

**判定**：**NO-GO**

**一句话**：合同面（PRD+plan）已闭合，消费/管理主路径与 P3 签收链 REAL；但 **G5 live 交付路径存在未签字 P0**，全模块 truth 未在 Aug 修复后复验，**不得宣称产品级可交付**。

### 5.1 Go 阻塞项

1. **未签字 P0 ×3**（G5-T6 · G5-T11 · T9）— SMTP 附件与 live Playwright PDF 未 REAL。
2. **Truth 张力未消解** — P3 REAL 9.2 与 G5 PARTIAL 5.8 并存；缺 **单一 full-scope** 权威审计。
3. **GATE-only / STUB** — T11 批量导入在全模块审计仍为 STUB（非阻塞 P0，但拉低 Truth 分）。

---

## 6. 交接清单

| 缺口 | 优先级 | 交接 Skill | 说明 |
|------|--------|------------|------|
| G5 live PDF + SMTP 附件 | P0 | `root-first-solve` → `verify-fix-loop` | FE base path · `add_attachment` |
| 全模块 truth 复验 | P0 | `/feature-truth-verify` | 合并 P3/G5/UX 为 full 报告 |
| T11 批量导入 STUB | P2 | `land-design-implement` 或补测 | happy path pytest |
| UX 扩展 SQL 字段 | P2 | `feature-land-design` | UX-T5 产品确认 |
| 壳层一致（可选旁轨） | P3 | `page-style-sync` / `ui-ux-reviewer` | 不阻塞 Go 门 |

---

## 7. 验证命令（复现）

```bash
# 合同扫盘（静态）
rg "RPT-00" docs/automate/prd/F08-RPT.md
rg "\[ \].*RPT" docs/automate/plan.md

# Truth 读盘
ls docs/feature-truth/*report*

# 抽样复跑（与 Jul 31 / Aug 4 审计一致）
cd fe && npx vitest run src/pages/admin/reports --reporter=dot
cd .. && python -m pytest tests/test_ff_rpt_companion_e95d.py tests/test_report_dev_seed.py tests/test_g5_live_export.py -q
```

---

## 8. 元信息

- **用户批准修复**：否（本 skill dry-run 只报告）
- **关联 truth**：`docs/feature-truth/2026-07-31-report-center-full-truth-audit.md` · `2026-08-03-report-center-g5-visual-pdf-truth-audit.md` · `2026-08-04-report-center-p3-truth-audit.md` · `2026-08-04-report-center-ux-truth-audit.md`
- **关联 PRD**：`docs/automate/prd/F08-RPT.md` · `docs/automate/plan.md` M9/M10/M12 · M-DEPTH F-E
- **关联 UX**：`docs/ux-critique/2026-07-30-report-center-backlog.md`（已全部闭合）

# Feature Truth Audit: 报表中心（Hub · 浏览 · 预制 · 默认路径）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-30 |
| 核验范围 | 报表中心 Hub、统一浏览页、预制分析、角色默认 landing；不含调度/模板管理深度验收 |
| 锚点 | `/admin/reports/center` · `/admin/reports/view/:nodeId` · `/admin/reports` · `defaultViewResolve.ts` · `/api/v1/reports/*` |
| 总体判定 | **PARTIAL**（主路径可通，2 处正确性/验证缺口） |
| **总分 / 档位** | **7/10 · B** |
| 状态 | draft |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | Hub 展示授权模板网格 + 预制入口；搜索/格式筛选即时生效 | `docs/ui/layout.md` §3/§5 · 归档 plan `2026-07-17-reports-de-ia-complete.md` |
| T2 | `/admin/reports/view/:nodeId` 进入 template 后自动运行一次，展示 Web 结果区 | 同上 · RPT-001 · 本轮优化 G7 |
| T3 | 预制页列出 binding，点击「运行」调 API 并展示表格/图表结果；viewer 无权时运行后诚实提示 | RPT-002 · `F08-RPT.md` |
| T4 | 角色默认报表 landing 至 `/admin/reports/view/{id}`，非模板编辑页 | 本轮 G6 · `defaultViewResolve.ts` |
| T5 | analyst/viewer 仅见 `report:read` 入口；admin 另见模板/调度 | `F01-BOOT.md` M-DEPTH · `nav-manifest.tsx` |

- **非目标**：目录树 G2、flat list API G4、调度只读 G9、卡片快捷导出 G10、另存为 G11、真实 PDF 排版引擎

## 2. 完整链路图

```
侧栏「全部报表」→ ReportCenterPage
  → GET catalog/nodes（递归）+ GET prefab/bindings + resolveDefaultReportTemplateNodeId
  → 模板卡片「查看」→ ReportViewPage
  → GET catalog/nodes/:id + POST templates/:id/run（auto-run + 手动）
  → renderSpec.sections → 结果表 + ReportExportCard

侧栏「预制报表」→ PrefabReportsPage
  → GET prefab/bindings → POST .../bindings/{key}/run → 结果区 / 403 无权态
```

| 序 | 层 | 状态 | L1 证据 | 说明 |
|----|----|------|---------|------|
| 1 | 路由/门禁 | 通 | `routes.tsx:164-168` · `RequireCapabilityName report:read` | center/view/prefab 需 read |
| 2 | Hub 数据 | 通 | `report-center.smoke.test.tsx` 4/4 | mock API 渲染模板+预制区 |
| 3 | 模板运行 | 部分 | 后端 companion 41/46；**无 ReportViewPage smoke** | 静态已接线 auto-run |
| 4 | 预制运行 | 通 | `prefab-reports.smoke.test.tsx` 4/4 | 含 viewer 403 路径 |
| 5 | 默认路径 | 通 | `defaultViewResolve.test.ts` 15/15 | `reportViewPath` 断言 |
| 6 | 导航 IA | 通 | `resolve-nav.test.ts` T-NAV-RPT-01 | analyst 见全部报表+预制 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T1 | 报表中心 Hub | **PARTIAL** | 8/B | 主网格 REAL；预制行「运行」仅跳转 |
| T2 | 统一浏览页 | **UNVERIFIED** | 6/C | 静态 auto-run 已写；缺 L1/smoke |
| T3 | 预制分析 | **REAL** | 9/A | smoke 4/4 + 后端 run 链 |
| T4 | 默认 landing | **REAL** | 9/A | 单测覆盖 reportViewPath |
| T5 | RBAC 导航 | **REAL** | 9/A | nav-manifest + resolve-nav |

**T 汇总（P0 取最低分）**：7/B · **PARTIAL**

## 3b. 前端控件下钻表

功能块映射：T1→B1–B12；T2→B13–B17；T3→B18–B22

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | 打开默认报表 | `ReportCenterPage.tsx:185` Link | 跳转 view 页 | 静态 Link 至 `/admin/reports/view/{id}` | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 无 smoke 覆盖默认卡片 |
| B2 | 预制报表卡片 | `QuickLinkCard` → `/admin/reports` | 进入预制页 | smoke 可见卡片 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke |
| B3 | 报表模板卡片 | admin → `/admin/reports/templates` | 管理页 | 静态+路由守卫 manage | 2 | 2 | 2 | 2 | 2 | 10 | REAL | 代码+路由 |
| B4 | 报表调度卡片 | admin → `/admin/reports/schedules` | 调度页 | smoke 见链接 href | 2 | 2 | 2 | 2 | 2 | 10 | REAL | report-center smoke |
| B5 | 查看全部（预制） | Link `/admin/reports` | 预制列表 | 跳转正确 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke |
| B6 | 预制行「运行」 | `PrefabRow.tsx:122` Link | 运行或直达可运行页 | **仅 Link 至 `/admin/reports`，无 binding 深链/运行** | 2 | **1** | 2 | 2 | 1 | **8** | **PARTIAL** | 打通但语义不对 |
| B7 | 模板卡片「查看」 | `TemplateCard.tsx:104` | → view 页 | href `/admin/reports/view/tpl-1` | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke |
| B8 | 搜索报表 | `Input onChange` + `filterCatalogTemplates` | 过滤网格 | 输入「不存在」→「无匹配报表」 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke + unit |
| B9 | 格式筛选 | `setKindFilter` | PDF/Word/Excel 过滤 | 单元测试覆盖；smoke 未点按 | 2 | 2 | 2 | 2 | 1 | 9 | REAL | `reportCatalogUtils.test.ts` |
| B10 | 管理模板 | Link templates | admin 入口 | 静态 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | 代码 |
| B11 | 空态浏览预制 | PanelEmptyState action | → prefab | 静态 Link | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 未测空 catalog |
| B12 | 错误重试 | `PageErrorBanner onRetry` | refetch catalog | 静态 refetch | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 未测失败态 |
| B13 | 返回报表中心 | `ReportViewPage.tsx:103` | → center | 静态 Link | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 无 smoke |
| B14 | 运行报表 | `runMutation.mutate` | POST run + 结果 | 静态接线；后端 companion 通过 | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 无 FE L1 |
| B15 | 编辑模板 | admin Link | → templates/:id | canManage 门控 | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 无 smoke |
| B16 | 发起导出 | `ReportExportCard.requestExport` | POST export + poll | 组件存在；未在本轮 L1 | 1 | 2 | 1 | 2 | 2 | 8 | UNVERIFIED | companion 后端有测 |
| B17 | 进入 auto-run | `useEffect` L87-95 | 进页自动 run 一次 | ref 防重复；**无 vitest** | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 静态代码 |
| B18 | 预制运行 | `usePrefabReports runMutation` | POST run → 表格 | smoke 点击→status/cnt 列 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke |
| B19 | Binding 表单 | `PrefabBindingForm` | admin PUT binding | manage 门控；smoke 未覆盖表单 | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | 代码 |
| B20 | 预制页导出 | `ReportExportCard` | 同 B16 | 未 L1 | 1 | 2 | 1 | 2 | 2 | 8 | UNVERIFIED | — |
| B21 | viewer 无权运行 | forbidden 卡片 | 403 后提示 | smoke viewer+mock 403 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | smoke |
| B22 | 列表加载失败 | `PageErrorBanner` | 重试 bindings | 未 L1 | 1 | 2 | 2 | 2 | 2 | 9 | UNVERIFIED | — |

**Out（本轮不验）**：`ReportTemplatesPage` 树操作、`ReportSchedulesPage` 重试（smoke 因 TooltipProvider 失败，见 §4）

**打通但不对**（L≥2 且 C≤1）：**B6**  
**假功能**（STUB/BROKEN）：无  
**缺 L1**（UNVERIFIED）：B1,B11,B12,B13–B17,B19–B22

## 3c. 五维评分汇总

| ID | L | C | D | E | F | 总分 | 档位 | 真假 | 备注 |
|----|---|---|---|---|---|------|------|------|------|
| T1 Hub | 2 | 1 | 2 | 2 | 2 | **8** | B | PARTIAL | B6 拖低 C |
| T2 浏览页 | 1 | 2 | 2 | 2 | 2 | **6** | C | UNVERIFIED | 缺 FE L1 |
| T3 预制 | 2 | 2 | 2 | 2 | 2 | **9** | A | REAL | — |
| T4 默认路径 | 2 | 2 | 2 | 2 | 1 | **9** | A | REAL | 仅单测 |
| T5 RBAC | 2 | 2 | 2 | 2 | 2 | **9** | A | REAL | — |
| **总体** | — | — | — | — | — | **7** | **B** | **PARTIAL** | P0 最低 T2/T1 |

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | **期望** | **实际** | 一致？ | 证据 |
|------|------|----------|----------|--------|------|
| 1 | `vitest report-center.smoke` | Hub 标题、模板、搜索、预制区 | 4 passed | ✅ | 2026-07-30 命令 |
| 2 | `vitest prefab-reports.smoke` | 列表、运行、viewer 403 | 4 passed | ✅ | 同上 |
| 3 | `vitest defaultViewResolve` | landing → `/admin/reports/view/{id}` | 15 passed | ✅ | 同上 |
| 4 | `vitest reportCatalogUtils` | 搜索/格式过滤 | 2 passed | ✅ | 同上 |
| 5 | `vitest report-schedules/templates smoke` | 调度/模板页 smoke 绿 | **5 failed** TooltipProvider | ❌ | 测试 harness 缺口，非产品断链 |
| 6 | `pytest test_ff_rpt_companion + m9 + m10` | RPT API companion | **41 passed, 5 failed** | ⚠️ | ACL 用例环境漂移；run 主链通过 |
| 7 | ReportViewPage 进页 auto-run | 自动 POST run + 结果区 | **未执行 FE L1** | ❌ | 无 smoke/E2E |
| 8 | Hub 预制行点「运行」 | 运行该 binding 或深链 | **仅跳转 `/admin/reports`** | ❌ | `PrefabRow.tsx:122` |

## 5. 修复文档

### B6 — 预制行「运行」（T1 · P0）

**判定 / 得分**：PARTIAL 8/10，C=1  
**期望 vs 实际**：期望点击「运行」触发该预制分析或带 binding 深链；实际与「查看全部」相同，一律跳转预制列表页。  
**下钻链**：`PrefabRow` Link → `/admin/reports`（无 query/bindingKey）  
**根因**：`fe/src/pages/admin/reports/ReportCenterPage.tsx` `PrefabRow` 未接 run 或 `/admin/reports?binding=`  
**修复方向**：Link 改为 `/admin/reports` + hash/query 预选 binding，或 Hub 内联调 run API（与预制页复用 hook）  
**修后验收**：C≥2，Hub 预制区 L1 smoke 断言 run 或深链选中  

### T2 — 统一浏览页 auto-run（P0）

**判定**：UNVERIFIED 6/10  
**期望 vs 实际**：期望进 view 页自动 run；静态 `useEffect` 已调用 `runReport()`，但无 vitest/浏览器 L1。  
**根因**：缺 `ReportViewPage.smoke.test.tsx`  
**修复方向**：新增 smoke：mock node template + mock POST run → 断言结果表/占位文案；覆盖 auto-run 仅一次  
**触及文件**：`fe/src/pages/admin/reports/ReportViewPage.smoke.test.tsx`（新建）  
**修后验收**：T2 L≥2、C≥2、总分≥8、REAL  

### P1 — 关联页 smoke TooltipProvider

**判定**：测试债务  
**期望 vs 实际**：`report-schedules.smoke.test.tsx`、`report-templates.smoke.test.tsx` 应绿  
**修复方向**：render 包裹 `TooltipProvider delayDuration={0}`（同 `SchedulePanel.smoke.test.tsx`）  
**修后验收**：reports 目录 vitest 全绿  

### P2 — 默认报表卡片边界（P1）

**期望 vs 实际**：角色有 `reportTemplateNodeId` 但 catalog 尚未加载到该 id 时，卡片不展示（`defaultReportNode` 为 undefined）  
**修复方向**：卡片在 `defaultReportId` 存在时仍展示，名称 fallback API GET node  
**优先级**：P1  

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| P0 | B6 | Hub 预制「运行」假动作，仅跳转列表 |
| P0 | T2 | 浏览页 auto-run 缺 L1，无法标 REAL |
| P1 | — | schedules/templates smoke 补 TooltipProvider |
| P1 | B1 | 默认报表卡片 catalog 竞态/缺失 fallback |

## 7. 验证命令（复现）

```bash
cd fe && npx vitest run src/pages/admin/reports/report-center.smoke.test.tsx src/pages/admin/reports/prefab-reports.smoke.test.tsx src/lib/defaultViewResolve.test.ts src/lib/reportCatalogUtils.test.ts

cd fe && npx vitest run src/pages/admin/reports/

python -m pytest tests/test_ff_rpt_companion_e95d.py tests/test_m9_rpt_theme_r233.py tests/test_m10_report_templates_r234.py -q
```

## 8. 交接

- **结论**：报表中心**主消费路径基本可用**（预制 REAL、Hub 网格 REAL、默认路径 REAL），但**整体 PARTIAL 7/B**——Hub 预制「运行」语义错误 + 浏览页缺 L1 无法确认 auto-run。
- **建议**：先修 P0（B6 + ReportViewPage smoke），再跑全量 reports vitest。
- **用户批准修复**：否

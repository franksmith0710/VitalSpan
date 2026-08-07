# VitalSpan 文档完整性评审 · 2026-08-07

## 总览

| 项 | 内容 |
|----|------|
| 范围 | **变更面**（模板中心 11 套内置种子 / 删除 / 预览；报表 PDF CJK；拖拽编辑器冻结修复） |
| Docs Card | 见下 |
| 扫描方式 | 并行 lane D1 / D3 / D5+D6；主 agent 补扫 D2 / D4 / D7 / D8 |
| Blind spots | D2 ADR 内嵌于 `arch.md`（非 `docs/adr/`）；D4 无独立 `docs/service/`；D7 无 `docs/data/`；无 `.evidence/` |
| P0 / P1 / P2 | **0 / 12 / 8** |
| 覆盖 | 应有 8 域 · 完整 3 · 漂移 2 · 缺失 1（`docs/mock/`） |
| prd-sync | **合适**（VitalSpan 以 `docs/services/` 代 `docs/domain/`，规则已写明） |
| 建议 | **补完本批 P1 漂移后可合入**；整仓「文档可毕业」仍须补 api 可消费深度与 mock 集中清单 |

**一句话结论**：本批代码已落地，但 `dashboard.md` / `reports.md` / `api/README.md` 与实现不同步；无 P0 误导交付，建议优先修补变更面三份文档。

### Docs Card（摘要）

- **文档根**：`docs/`（VitalSpan 分层：SRS · automate · **services** · api · arch · ui · feature-truth · user-guide）
- **非标准路径**：ADR 在 `docs/arch.md` §ADR（非 `docs/adr/`）；业务域在 `docs/services/`（非 `docs/domain/`）——与 `prd-sync.mdc` 一致
- **代码面**：FastAPI `backend/app/{13域}` · React `fe/` · API 索引 `docs/api/README.md` · 迁移 `backend/migrations/`
- **本批变更**：
  - `backend/app/dashboard/templates/`（seed rev 25 · 11 builtin · `presets_exported.py`）
  - `fe/.../viz-templates/`（删除 · 真实预览）
  - `backend/app/reports/render/pdf_fonts.py`
  - `fe/src/lib/chartMountScheduler.ts`（前端 only，通常无需 API/域文档）
- **mock 痕迹**：`docs/mock/` **不存在**；stub 分散于 `docs/services/{nfr,reports,query,governance}.md`
- **跳过的 lane**：D7 data（持久化在 arch ADR-07 + Alembic，无独立 `docs/data/`——记 Blind spot，非本批阻塞）

## 覆盖矩阵

| 应有路径 | 类型 | 状态 | 动作 |
|----------|------|------|------|
| `docs/services/dashboard.md` | services | **漂移** | 更新 templates/ 节（11 套 · 删除守卫 · 锚点） |
| `docs/services/reports.md` | services | **漂移** | 补 PDF CJK 字体回退链 |
| `docs/api/README.md` | api | **漂移 + 薄** | 补 export-jobs · readiness；扩展 DELETE 语义 |
| `docs/mock/` | mock | **缺失** | 新建集中 stub 清单（至少 nfr-push · reports-scheduler） |
| `docs/ui/layout.md` | ui | **部分** | 补模板中心 CRUD/RBAC；看板栅格拖拽 IA |
| `docs/ui/anchor.md` | ui | **缺失** | 可选新建页面→组件锚点（P1 体系缺口） |
| `docs/README.md` | index | OK | — |
| `.cursor/rules/prd-sync.mdc` | rule | OK | 保持 |
| `docs/services/README.md` | index | **漂移** | 修订记录未反映 2026-08 模板/PDF 变更 |

## 可消费深度（api / domain）

| 路径 | 类型 | 闸门 | 结论 |
|------|------|------|------|
| `docs/api/README.md` | api | A1–A8 | **fail** — 索引登记簿；无环境变量表、取 token 步骤、逐端点 JSON、冒烟清单 |
| `docs/services/*.md` | domain（VitalSpan services） | D1–D8 | **fail** — 职责/边界/依赖合格；无 Process Test Pack、无 Given/When/Then |

> 判定：VitalSpan 长期以 `api/README.md` 为路由真源 + OpenAPI `/docs` 为运行时契约；**可消费深度不足是体系性 P1**，非本批独有，但本批新增路由须先补索引行。

## Blind spots / 未完成 lane

| Lane | 状态 | 说明 |
|------|------|------|
| D2 adr | 跳过（合理） | ADR 内嵌 `docs/arch.md`，非独立 `docs/adr/` |
| D4 service | 跳过（合理） | 部署/运维在 `arch.md` + 根 `README.md`，无 `docs/service/` |
| D7 data | 跳过 | 无 `docs/data/`；schema 在 ORM + Alembic |
| Phase 2.5 evidence | 无 | 仓内无 `.evidence/` |
| L1 结构性 | rg-only | mock 扫描依赖词法，注释/字符串误报风险未消除 |

## prd-sync 结论

| 项 | 结果 |
|----|------|
| 路径 | `.cursor/rules/prd-sync.mdc` ✅ |
| 分类与 taxonomy | **一致** — VitalSpan 用 `docs/services/` 承担 domain 角色，规则已说明 |
| 真源与 mock 条款 | 有同步总表；**未要求** `docs/mock/`（通用 taxonomy 与项目实例有 gap） |
| 建议 | **保持 prd-sync**；可选在 prd-sync 或 `docs/README.md` 增一行：`非测试 stub → docs/mock/` 或 `docs/services/` 诚实节 |

## P0 Findings

（无）

## P1 Findings

### P1-1 · `dashboard.md` 内置模板数量过时

| 字段 | 内容 |
|------|------|
| 类别 | 漂移 |
| 证据 | `docs/services/dashboard.md` L34 写「大屏 4 + 看板 3」；`seed.py` `BUILTIN_SEED_CONTENT_REVISION=25` 为 **6+5=11** 套 |
| 为何应修 | Agent/研发按文档理解种子范围会漏测新模板（含 `builtin-gov-industrial-park`） |
| 建议修法 | 更新 templates/ 节：11 套清单、`presets_exported.py` 锚点、`content_revision` 幂等语义 |
| 可批量 | 是（批次 **B1-services**） |

### P1-2 · 模板删除规则未入域文档

| 字段 | 内容 |
|------|------|
| 类别 | 漂移 |
| 证据 | `templates/service.py` builtin→403；`templateLabels.ts` `canDeleteTemplate`；`dashboard.md` 仅写 CRUD |
| 建议修法 | templates/ 节增删除守卫表（builtin 只读 · org/private owner 或 admin） |
| 可批量 | 是（B1） |

### P1-3 · `reports.md` 缺 PDF CJK 字体策略

| 字段 | 内容 |
|------|------|
| 类别 | 漂移 |
| 证据 | `pdf_fonts.py` 多级回退（NotoSansSC → 系统字体 → STSong-Light CID）；`reports.md` render 节未记 |
| 建议修法 | render/ 节补字体解析链与部署验收点（中文 PDF 非黑块） |
| 可批量 | 是（B1） |

### P1-4 · API 索引缺 Dashboard export-jobs 三路由

| 字段 | 内容 |
|------|------|
| 类别 | 缺失 |
| 证据 | `dashboards.py:453-481` 有 POST/GET/download；`api/README.md` 无 `export-jobs` |
| 建议修法 | §5 补三行并说明与 `export-layout`/`export-query` 分工 |
| 可批量 | 是（批次 **B2-api**） |

### P1-5 · API 索引缺报表模板 readiness 端点

| 字段 | 内容 |
|------|------|
| 类别 | 缺失 |
| 证据 | `reports/__init__.py` `POST /reports/catalog/templates/readiness` |
| 建议修法 | §6 登记 + `TemplateReadinessIn` 字段 |
| 可批量 | 是（B2） |

### P1-6 · `docs/api/README.md` 不可消费（体系性）

| 字段 | 内容 |
|------|------|
| 类别 | 不可消费 |
| 证据 | 全文为方法\|路径表；仅 ingestion 有 JSON 示例；无 Postman/冒烟清单 |
| 建议修法 | 分期拆模块页或附 Collection；本批至少补变更路由行 |
| 可批量 | 否（需里程碑级投入） |

### P1-7 · `docs/mock/` 目录缺失

| 字段 | 内容 |
|------|------|
| 类别 | 缺失 |
| 证据 | `docs/mock/` 0 文件；生产 stub 在 `nfr/push_channels.py`、`reports/scheduler/*`、`query/dataset/executor.py` |
| 建议修法 | 新建 `docs/mock/nfr-push.md`、`reports-scheduler.md` 等诚实清单 |
| 可批量 | 是（批次 **B3-mock**） |

### P1-8 · `docs/ui/anchor.md` 缺失

| 字段 | 内容 |
|------|------|
| 类别 | 缺失 |
| 证据 | `docs/ui/` 仅 `layout.md` + `map-texture.md` |
| 建议修法 | 新建 anchor：页面→关键组件表（模板 Hub、DashboardEditWorkspace） |
| 可批量 | 是（批次 **B4-ui**） |

### P1-9 · 模板中心 CRUD/RBAC 未入 `layout.md`

| 字段 | 内容 |
|------|------|
| 类别 | 漂移 |
| 证据 | `VizTemplatesHubPage` 删除/发布/导入；layout 仅一行 Hub 路由 |
| 建议修法 | layout § 增 DASH-009 子节：操作流 + `dashboard:read` vs `dashboard:template.manage` |
| 可批量 | 是（B4） |

### P1-10 · 看板栅格拖拽编辑器 IA 空白

| 字段 | 内容 |
|------|------|
| 类别 | 缺失 |
| 证据 | `DashboardGrid` + `ChartMountInteractionBridge`；layout 详述大屏像素画布，看板拖拽几乎无 |
| 建议修法 | layout 补 v1 栅格编辑三栏 IA + 拖拽时图表挂载冻结（指向 `chartMountScheduler`） |
| 可批量 | 是（B4） |

### P1-11 · `services/README.md` 修订记录未更新

| 字段 | 内容 |
|------|------|
| 类别 | 漂移 |
| 证据 | 末条 0.5.3（2026-07-29）；本批 2026-08 模板/PDF 未记 |
| 建议修法 | +0.5.4 修订行 |
| 可批量 | 是（B1） |

### P1-12 · 域附录不可消费（体系性）

| 字段 | 内容 |
|------|------|
| 类别 | 不可消费 |
| 证据 | `docs/services/*.md` 无 Process Test Pack |
| 建议修法 | 关键域（dashboard templates 删除、reports PDF）可先补 mini 测试表 |
| 可批量 | 否（分期） |

## P2 Findings

| ID | 标题 | 证据 | 建议 |
|----|------|------|------|
| P2-1 | DELETE template API 错误码过薄 | api §5 L223 | 补 403/404 码 |
| P2-2 | GET dashboard-templates 查询参数未记 | `dashboard_templates.py:44-74` | 补 surfaceKind/status 等 |
| P2-3 | GET reports/export from/to 未记 | `export.py:41-42` | 补时间窗参数 |
| P2-4 | Hub URL 深链筛选未记 | `?surfaceKind=&categoryKey=` | layout 补一行 |
| P2-5 | 模板就地编辑同步未记 | `TEMPLATE_EDIT_SESSION` | layout 或 services |
| P2-6 | `editor-save` 事务保存未入 layout | `dashboard.md` 有 | layout 交叉引用 |
| P2-7 | feature-truth 无 DASH-009 专项 | feature-truth/ | 可选补 truth audit |
| P2-8 | chartMount 冻结为纯 FE 修复 | 无 API 变更 | 仅需 layout 一句说明，无需 api |

## 非问题（已排除）

1. **chartMountScheduler 拖拽修复**：纯前端交互，无新 API；不必改 `api/README.md`（P2-8 可选 UI 说明）。
2. **DELETE dashboard template 路由**：已在 api §5 登记，非 missing route。
3. **默认管理员种子**：按 production 规则不作漏洞标题。
4. **测试双**：`chartMountScheduler.test.ts`、React Query `placeholderData` 等不进 mock 文档。
5. **ADR 不在 `docs/adr/`**：VitalSpan 锁定 `arch.md` 为 ADR 真源。

## 待确认批次

| 批次 | 范围 | Finding ID | 预估 |
|------|------|------------|------|
| **B1-services** | `dashboard.md` · `reports.md` · `services/README.md` | P1-1~3, P1-11 | 小 |
| **B2-api** | `docs/api/README.md` 索引行 | P1-4, P1-5, P2-1~3 | 小 |
| **B3-mock** | 新建 `docs/mock/*.md` | P1-7 | 中 |
| **B4-ui** | `layout.md` + 可选 `anchor.md` | P1-8~10, P2-4~6 | 中 |
| **defer** | api/domain 可消费深度、Process Test Pack | P1-6, P1-12 | 里程碑级 |

---

*生成：docs-reviewer · mode=review · fix_mode=confirm · 确认批次后再写文档。*

---

## 修复记录（2026-08-07）

已按用户确认执行 **B1–B4 全部批次**：

| 批次 | 状态 | 路径 |
|------|------|------|
| B1-services | ✅ | `docs/services/dashboard.md` · `reports.md` · `README.md` |
| B2-api | ✅ | `docs/api/README.md` v1.0.9 |
| B3-mock | ✅ | `docs/mock/README.md` + 4 模块清单 |
| B4-ui | ✅ | `docs/ui/layout.md` v1.3.4 · `docs/ui/anchor.md` |
| R0 | ✅ | `docs/README.md` · `.cursor/rules/prd-sync.mdc` |

**仍延期（里程碑级）**：api/domain A1–A8 / D1–D8 可消费深度（P1-6 · P1-12）。

# 演化轮次选题 — 2026-07-03（M1 BOOT 测试覆盖补强）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：M1 P0 工程基线 — BOOT 全项测试覆盖补强（推动主薄弱维 `test_coverage` 由 8–42% 向 ≥40% 靠拢，加权总分向 90 迈进）
- **来源**：`docs/automate/plan.md` §M1 勾选清单 6/6 已完成；§文档回写 4 行 PR #6（8055d0d）已履约但 plan 仍为 `[ ]`（无 BOOT-ID 格式，勾选留 P5/plan-fix）；`prd.md` hub 8 维 — 已实现 BOOT 项主薄弱维均为测试覆盖
- **合并理由**：上轮（文档回写 + `/me` smoke）已合并；P5 重评后 BOOT-001~006 加权总分 64.8–78.6，仍连续未过 90（STUCK 计数 1–2 轮）。在 M1B 未激活前，以同里程碑批处理补齐 pytest/前端 smoke，比跳跃选题 META-001（10.8）等远期未实现项更符合 plan 顺序与 goal G1 工程基线
- **范围框定**：
  - **模块**（3）：`tests/`、`backend/app/core/`（TraceId/Settings）、`fe/`（BOOT-002 最小 smoke）
  - **文件**（合计约 10，≤20）：各子项所列测试与必要 fixture
  - **不含**：M1B（DATA-*，queued）；远期薄弱项 META-001 / DESIGN-001 / CONN-021；plan 文档回写重复实施
- **不足 5 项原因**：不适用 — 本轮满 5 项，均为 M1 BOOT 测试补强同批主题

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | F11-META 术语字典，M11+ 远期，完整度 5% 因未实现 |
| DESIGN-001 | 10.8 | F12-DESIGN 拖拽查询，M10+ 治理设计器 |
| CONN-021 | 10.9 | TiDB 连接器属 M4，非当前节 |
| BOOT-003 | 78.6 | 上轮 `/me` smoke 已补强至测试覆盖 55%，本轮让位更低分项 |
| DATA-004 | 12.5 | M1B queued，plan 明确 M1 完成后激活 |
| plan §文档回写 4 行 | — | PR #6 已落地；plan `[ ]` 为结构未同步，非重复选题 |

---

### 子项 1：BOOT-005 数据库迁移框架 — Settings 与 Alembic 配置测试

- **选题理由**：hub 显示 BOOT-005 测试覆盖维 **8%**（六项 BOOT 最低），加权总分 66.8；plan §BOOT-005 交付 `alembic.ini`、`migrations/env.py` 从 `Settings.DATABASE_URL` 读取，可单元测试而不依赖 docker
- **选题时 PRD 加权总分**：66.8/100（用户价值 70% · 完整度 82% · 可靠性 65% · 架构 86% · 测试覆盖 **8%** · 性能 78% · 安全性 70% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（8%）
- **用户感知**：CI pytest 自动验证迁移配置与 Settings 加载链，元库连接串错配可在合并前暴露
- **类型**：补缺（测试补强，非新迁移逻辑）
- **验收标准**（来源 plan §BOOT-005 + §BOOT-006 CI）：
  - `tests/test_migrations.py`（或等价）：`Settings` 含 `database_url`；`migrations/env.py` 可导入且绑定 URL 来源与 `Settings` 一致（mock/monkeypatch，**不启动** docker postgres）
  - `cd backend && pytest` 全绿；不将 `alembic upgrade` 纳入 CI（与 plan 一致）

### 子项 2：BOOT-004 配置与日志基线 — TraceId 中间件测试

- **选题理由**：BOOT-004 测试覆盖 **12%**，加权总分 74.2；plan §BOOT-004 要求 `GET /health` 日志 JSON 含 `traceId`，可用 TestClient 断言响应头/日志 context
- **选题时 PRD 加权总分**：74.2/100（用户价值 74% · 完整度 94% · 可靠性 72% · 架构 90% · 测试覆盖 **12%** · 性能 82% · 安全性 78% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（12%）
- **用户感知**：每次健康检查请求的 trace 可追踪性有自动化回归保障
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-004 验证）：
  - `tests/test_trace.py`（或扩展现有 health 测试）：`GET /health` 响应含 `X-Trace-Id`（若中间件透出）或日志 context 含 `traceId`；透传已有 `X-Trace-Id` 请求头时保持一致
  - `cd backend && pytest` 全绿

### 子项 3：BOOT-002 React 管理端壳层 — 构建与设计 Token 门禁 smoke

- **选题理由**：BOOT-002 加权总分 **64.8**（已实现 BOOT 最低），测试覆盖 **22%**；plan §BOOT-002 已有 `pnpm build` + `check:design`，本轮补最小自动化 smoke（vitest 或脚本级路由存在性检查）使测试维可重评
- **选题时 PRD 加权总分**：64.8/100（用户价值 76% · 完整度 94% · 可靠性 65% · 交互体验 72% · 架构 92% · 测试覆盖 **22%** · 性能 82% · 安全性 58% · 交互为前端条件维）
- **主攻薄弱维**：测试覆盖（22%）；加权总分（64.8，六项最低）
- **用户感知**：CI 除 build/check:design 外，壳层路由与 AdminLayout 挂载有自动回归，前端基线更稳
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-002 + §BOOT-006）：
  - `fe/` 增最小测试（如 vitest：`routes.tsx` 导出 `/admin` 路由或 `AdminLayout` smoke render）
  - `fe/package.json` scripts 与 `.github/workflows/ci.yml` frontend job 拾取新测试命令（如 `pnpm test` 或 `pnpm run test:smoke`）
  - `pnpm build` + `check:design` 仍通过

### 子项 4：BOOT-001 FastAPI 工程骨架 — 健康检查与 CORS 预检测试

- **选题理由**：BOOT-001 测试覆盖 **32%**；现有 `tests/test_health.py` 仅断言 200，plan §BOOT-001 还要求 CORS 预检与 OpenAPI 可访问性可扩展为 pytest
- **选题时 PRD 加权总分**：72.4/100（用户价值 76% · 完整度 94% · 可靠性 72% · 架构 88% · 测试覆盖 **32%** · 性能 84% · 安全性 70% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（32%）
- **用户感知**：前后端联调所需的 CORS 与健康检查行为在 CI 中可重复验证
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-001 验证）：
  - 扩展 `tests/test_health.py`：`OPTIONS` 预检含 `Access-Control-Allow-Origin`（对齐 `Settings.cors_origins`）；`GET /docs` 或 `/openapi.json` → 200（公开路径）
  - `cd backend && pytest` 全绿

### 子项 5：BOOT-006 CI 与质量门禁 — 测试套件整合与 conftest 加固

- **选题理由**：BOOT-006 加权总分 66.4，测试覆盖 **42%**；本轮前四项新增用例须被 CI 稳定拾取；`conftest.py` fixture 可统一覆盖鉴权/TraceId 场景，提升回归套件完整度
- **选题时 PRD 加权总分**：66.4/100（用户价值 75% · 完整度 88% · 可靠性 68% · 架构 88% · 测试覆盖 **42%** · 性能 78% · 安全性 62% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（42%）；可靠性（CI 稳定性）
- **用户感知**：PR 合并前 backend + frontend 测试门禁更完整，M1 质量基线可感知提升
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-006）：
  - `tests/conftest.py`：复用 `TestClient(app)`；可选共享 `auth_headers` fixture（`Bearer dev`）
  - `.github/workflows/ci.yml`：backend job 执行本轮全部 pytest；frontend job 执行子项 3 新测试
  - 本地 `cd backend && ruff check . && pytest -v` 与 CI 等价全绿

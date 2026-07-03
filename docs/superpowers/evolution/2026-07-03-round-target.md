# 演化轮次选题 — 2026-07-03（M1 文档回写 + 测试补强）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：M1 P0 工程基线收尾 — 文档真理源回写 + 鉴权 smoke 测试补强（完成 plan §M1「文档回写」全部未完成勾选）
- **来源**：`docs/automate/plan.md` §M1「M1 完成 — 文档回写」4 项 `[ ]`；`prd.md` hub 8 维作 tie-break（BOOT 全项主薄弱维为测试覆盖 8–32%）
- **合并理由**：PR #4 已合并 BOOT-002/006 实现；plan §M1 勾选清单六勾已全部完成，**当前节唯一未完成块**为文档回写。代码与文档漂移会阻塞 M1 正式收口与后续 M1B 激活判断；hub 显示 BOOT-001~006 测试覆盖维仍 ≤32%，须在本轮以 `/me` smoke 补强
- **范围框定**：
  - **模块**（≤3）：`docs/`（api · services · arch · prd 分片）、`tests/`（鉴权 smoke）
  - **文件**（合计约 8，≤20 上限）：见各子项
  - **不含**：新功能开发；M1B（DATA-*，queued 未激活）；远期薄弱项 META-001 / DESIGN-001 / CONN-021（总分 10.8–10.9，非 M1 节）
- **不足 5 项原因**：plan 文档回写 checklist 为 4 行；按交付物拆为 4 文档子项 + 1 测试补强子项凑满 5，同属 M1 收尾批处理，未突破单轮文件/模块上限

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | F11-META 术语字典，里程碑远期，不在 M1 当前节 |
| DESIGN-001 | 10.8 | F12-DESIGN 拖拽查询条件，M10+ 治理设计器 |
| CONN-021 | 10.9 | TiDB 连接器属 M4，M1B 未激活 |
| QUERY-007 | 10.9 | 配置元模型存储，M5+ |
| DATA-004 | 12.5 | M1B queued，plan 明确 M1 完成后才激活 |
| BOOT-002 | 60.6 | 实现已完成（PR #4）；本轮仅文档回写与测试，不重复壳层/CI 实施 |

---

### 子项 1：BOOT-001 API 路由登记 — `/health`

- **选题理由**：plan §M1 文档回写第 1 项要求 `docs/api/README.md` 将 `/health` 标为已实现；BOOT-001 为健康检查入口，api 登记簿是 HTTP 契约真理源
- **选题时 PRD 加权总分**：69.4/100（用户价值 74% · 完整度 86% · 可靠性 68% · 架构 88% · 测试覆盖 8% · 性能 84% · 安全性 68% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（8%）；文档完整度对齐后 P5 可重评 completeness
- **用户感知**：开发者查 `docs/api/README.md` 可确认 `/health` 已可用及代码锚点
- **类型**：补缺（文档对齐，非新功能）
- **验收标准**（来源 plan §M1 完成 — 文档回写）：
  - `docs/api/README.md`：`GET /health` 状态 → `已实现`；锚点指向 `backend/app/main.py`
  - 与现有实现行为一致（200、无鉴权）
- **范围框定**：
  - `docs/api/README.md`（`/health` 相关行）

### 子项 2：BOOT-003 API 登记与鉴权域文档 — `/api/v1/me`

- **选题理由**：plan 文档回写第 1–2 项要求新增 `GET /api/v1/me` 登记并更新 `auth.md`；BOOT-003 鉴权中间件与 `/me` 占位路由是 M1 验收核心
- **选题时 PRD 加权总分**：73.4/100（用户价值 78% · 完整度 92% · 可靠性 74% · 架构 88% · 测试覆盖 10% · 性能 86% · 安全性 74% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（10%）；安全性文档锚点
- **用户感知**：API 索引可见受保护路由；`docs/services/auth.md` 反映 `AuthMiddleware`、`main.py` 注册与 `Bearer dev` 占位行为
- **类型**：补缺
- **验收标准**（来源 plan §M1 完成 — 文档回写 + §BOOT-003）：
  - `docs/api/README.md`：**新增** `GET /api/v1/me`（M1 占位验收，锚点 `api/v1/me.py`）；§1 `auth/me` 保留「规划」并注「二期正式路径」
  - `docs/services/auth.md`：状态与代码锚点（`auth/middleware.py`、`deps.py`、`main.py` 注册 `AuthMiddleware`、`PUBLIC_PATHS`）
- **范围框定**：
  - `docs/api/README.md`（`/api/v1/me` 与 §1 注记）
  - `docs/services/auth.md`

### 子项 3：BOOT-004 核心域文档 — CORS 与 TraceId

- **选题理由**：plan 文档回写第 2 项要求 `core.md` 同步 CORS、TraceId 与 `main.py` 挂载事实；BOOT-004 配置/日志/中间件是后端横切基线
- **选题时 PRD 加权总分**：70.7/100（用户价值 72% · 完整度 88% · 可靠性 70% · 架构 90% · 测试覆盖 8% · 性能 82% · 安全性 76% · 交互 N/A）
- **主攻薄弱维**：测试覆盖（8%）；文档与 `arch.md` 交叉引用一致性
- **用户感知**：域附录准确描述 `Settings`、`TraceIdMiddleware`、`CORSMiddleware` 职责与锚点
- **类型**：补缺
- **验收标准**（来源 plan §M1 完成 — 文档回写）：
  - `docs/services/core.md`：更新实现状态与代码锚点（`core/config.py`、`core/logging.py`、`core/middleware.py`；CORS 来源 `Settings.cors_origins`）
  - `docs/services/README.md` 索引状态与 core/auth 一致（若索引表含状态列）
- **范围框定**：
  - `docs/services/core.md`
  - `docs/services/README.md`（仅状态/锚点行，若有）

### 子项 4：BOOT-002/006 架构注记与 PRD 分片回写

- **选题理由**：plan 文档回写第 3–4 项要求 `arch.md` M1 过渡布局与 PRD hub 计数，以及 `F01-BOOT.md` 全项标已实现；覆盖 BOOT-002 前端目录与 BOOT-006 CI 交付的文档侧闭环
- **选题时 PRD 加权总分**：BOOT-002 60.6/100 · BOOT-006 62.6/100（两子项均主薄弱维测试覆盖 22%/32%）
- **主攻薄弱维**：完整度（PRD 分片状态与 plan 勾选对齐）；架构文档与 `fe/`、`ci.yml` 目录一致
- **用户感知**：`arch.md` 反映 M1 真实目录（`fe/`、`auth` 在 `main.py` 注册）；PRD 分片验收标准全绿，便于 P5 重评
- **类型**：补缺
- **验收标准**（来源 plan §M1 完成 — 文档回写）：
  - `docs/arch.md`：§4.2 `auth` 挂载改为 `main.py` 注册；§4.3 增 **M1 过渡布局**注记（`fe/` Admin 壳层）；§10 PRD hub 计数 → **124 项**
  - `prd/F01-BOOT.md`：BOOT-001~006 状态 → `已实现`；验收标准勾选与 plan §BOOT-* 一致
- **范围框定**：
  - `docs/arch.md`（§4.2、§4.3、§10）
  - `prd/F01-BOOT.md`（BOOT-001~006 状态与验收勾选）

### 子项 5：BOOT-003 鉴权 smoke 测试 — `/api/v1/me` 401/200

- **选题理由**：hub 显示 BOOT-001~006 测试覆盖维 8–32%，为系统最薄弱维；plan §BOOT-003 已定义 curl 验收，本轮固化为 pytest 用例，与现有 `test_health.py` 对称，提升 P5 可重评证据
- **选题时 PRD 加权总分**：73.4/100（同上 BOOT-003）
- **主攻薄弱维**：测试覆盖（10% → 目标 ≥40% 维度分%）
- **用户感知**：CI pytest 自动验证无 Token 401、`Bearer dev` 200，鉴权骨架回归可重复
- **类型**：补缺（测试补强，非行为变更）
- **验收标准**（来源 plan §BOOT-003 验证 + §BOOT-006 CI）：
  - `tests/test_me.py`（或等价文件）：`GET /api/v1/me` 无 Authorization → 401；`Authorization: Bearer dev` → 200
  - `cd backend && pytest` 全绿；CI backend job 无需改动即可拾取新用例
- **范围框定**：
  - `tests/test_me.py`

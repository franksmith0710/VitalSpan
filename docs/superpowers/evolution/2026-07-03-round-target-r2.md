# 演化轮次选题 — 2026-07-03（R2 · M1 收尾）

## 本轮演化目标（共 4 项）

### 选题决策

- **批量主题**：M1 P0 工程基线收尾 — React 管理端壳层 + CI 质量门禁
- **来源**：`docs/automate/plan.md` §M1 当前节未完成勾选清单（`BOOT-002`、`BOOT-006`）；`prd.md` hub 8 维作同分 tie-break；推荐执行顺序 `BOOT-002 → BOOT-006`
- **合并理由**：上轮 PR #2 已交付后端启动链（BOOT-004/001/005/003）；M1 仅剩前端壳层与 CI 两项主勾选。二者合计约 17–19 文件、2 模块（`fe/`、`.github/workflows/` + `tests/`），在单轮 ≤20 文件、≤3 模块上限内，且 CI 依赖 `fe build` + `check:design` 与 BOOT-002 交付物，宜同轮批处理
- **范围框定**：
  - **模块**（2）：`fe/`（前端壳层）、`tests/` + `.github/workflows/`（CI smoke，计为质量横切）
  - **文件**（合计约 18）：见各子项
  - **不含**：M1 文档回写 checklist（`docs/api/`、`docs/services/`、`docs/arch.md`、`prd/F01-BOOT.md` 状态）— 留 P5 闭环；TanStack Query / API 客户端（二期）；docker postgres 纳入 CI
- **不足 5 项原因**：M1 plan 主勾选仅剩 2 项 PRD ID；将 BOOT-002 按 plan 交付物拆为 3 可验收子项后共 4 项，已达单轮合理上限。待办池空；同节无其他未竟 prd ID；M1B（DATA-*）未激活。M1 文档回写不占演化 slot，随 P5 对账

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | 术语字典属 F11-META 远期，不在 M1 当前节 |
| DESIGN-001 | 10.8 | 治理设计器 M10+，M1B 未激活 |
| CONN-021 | 10.9 | TiDB 连接器 M4，非当前里程碑 |
| BOOT-001 | 69.4 | plan 已勾选完成（2026-07-03）；本轮不重复 |
| BOOT-003 | 73.4 | plan 已勾选完成；本轮不重复 |
| BOOT-004 | 70.7 | plan 已勾选完成；本轮不重复 |
| BOOT-005 | 66.8 | plan 已勾选完成；本轮不重复 |
| DATA-004 | 12.5 | M1B 待激活，M1 未完成前不跨节 |

### 饱和熔断

- **判定**：跳过。`plan.md` 当前节 M1 含未完成 `[ ]`（BOOT-002、BOOT-006），按 skill 前置规则不触发饱和熔断。

---

### 子项 1：BOOT-002 Vite/pnpm 工程与 Tailwind Token 基线

- **选题理由**：plan §M1 推荐顺序第 5 项首位；无 pnpm/Vite/Tailwind v4 脚手架则后续壳层、主题与 `check:design` 无承载
- **选题时 PRD 加权总分**：12.0/100（用户价值 51% · 完整度 5% · 可靠性 0% · 架构 9% · 测试 0% · 性能 0% · 安全 9% · 交互 N/A）
- **主攻薄弱维**：完整度、可靠性、测试覆盖（均 ≤40%）
- **用户感知**：`cd fe && pnpm dev` 可启动；Tailwind v4 + 设计系统 Token 加载；`VITE_API_BASE_URL` 或 dev proxy 指向后端
- **类型**：补缺（M1 Admin 壳层未落地）
- **验收标准**（来源 plan §BOOT-002）：
  - `fe/package.json` + `vite.config.ts`：pnpm；react、react-router v7、tailwind v4、shadcn/Radix 最小集
  - `fe/src/index.css`：Tailwind v4 + Token（b-design-system `from-zero.md`）
  - `fe/.env.example` 含 `VITE_API_BASE_URL`
  - `pnpm build` 成功
- **范围框定**：
  - `fe/package.json`
  - `fe/vite.config.ts`
  - `fe/src/index.css`
  - `fe/.env.example`
  - `fe/src/main.tsx`、`fe/index.html`（Vite 入口，若脚手架需要）

### 子项 2：BOOT-002 shadcn 基元与 Admin 壳层路由

- **选题理由**：plan BOOT-002 核心交付；290px 侧栏 Admin 壳层与 `/admin/*` 路由是用户可见 M1 前端里程碑
- **选题时 PRD 加权总分**：12.0/100（同上 BOOT-002）
- **主攻薄弱维**：完整度、交互体验（壳层落地后 ux 维将可评）
- **用户感知**：浏览器访问 `/admin` 可见管理端壳层（侧栏 + 内容区）；主题与布局符合 `layout.md` §2
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-002）：
  - `fe/src/components/ui/*`：button、input 等 shadcn 最小集
  - `fe/src/components/README.md`：公共组件索引
  - `fe/src/layouts/AdminLayout.tsx`：290px 侧栏
  - `fe/src/routes.tsx`：react-router v7 嵌套；`/admin/*` 挂 `AdminLayout`
  - 浏览器 `/admin` 可访问壳层
- **范围框定**：
  - `fe/src/components/ui/*`
  - `fe/src/components/README.md`
  - `fe/src/layouts/AdminLayout.tsx`
  - `fe/src/routes.tsx`

### 子项 3：BOOT-002 check:design 设计系统门禁

- **选题理由**：plan 要求 `check:design` 禁止硬编码色；为 BOOT-006 CI frontend job 前置
- **选题时 PRD 加权总分**：12.0/100（同上 BOOT-002）
- **主攻薄弱维**：完整度、架构健康（设计 Token 纪律）
- **用户感知**：团队 CI 与本地 `pnpm run check:design` 可拦截 `#hex`/`rgb(` 硬编码，保障视觉一致性
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-002）：
  - `fe/scripts/check-design.mjs` 扫描 `fe/src` 禁止 `#hex`/`rgb(`（`@design-token-ok` 豁免）
  - `fe/package.json` scripts：`"check:design": "node scripts/check-design.mjs"`
  - `pnpm run check:design` 退出码 0
- **范围框定**：
  - `fe/scripts/check-design.mjs`
  - `fe/package.json`（scripts 段）

### 子项 4：BOOT-006 CI 与质量门禁

- **选题理由**：plan §M1 末项；后端 ruff/pytest + 前端 build/check:design 形成 PR 质量门禁，闭合 M1 工程基线
- **选题时 PRD 加权总分**：12.8/100（用户价值 50% · 完整度 5% · 可靠性 0% · 架构 13% · 测试 0% · 性能 0% · 安全 13% · 交互 N/A）
- **主攻薄弱维**：完整度、测试覆盖、可靠性
- **用户感知**：PR 触发 CI 自动跑 ruff、pytest、`fe build`、`check:design`；`GET /health` smoke 测试保障后端回归
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-006）：
  - `.github/workflows/ci.yml`：backend job（`ruff check` + `pytest`）；frontend job（`pnpm install` + `build` + `check:design`）；**不启动** docker postgres
  - `.gitignore`：`.env`、`node_modules/`、`fe/dist/` 等
  - `tests/conftest.py`：`TestClient(app)` fixture
  - `tests/test_health.py`：`GET /health` → 200
  - `backend/pyproject.toml` 含 `[tool.ruff]`、`[tool.pytest.ini_options]` `testpaths = ["../tests"]`
- **范围框定**：
  - `.github/workflows/ci.yml`
  - `.gitignore`
  - `tests/conftest.py`
  - `tests/test_health.py`

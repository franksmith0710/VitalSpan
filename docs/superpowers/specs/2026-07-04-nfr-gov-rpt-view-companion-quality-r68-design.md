# 跨域 companion 质量推分 r68 设计 — NFR-003 / NFR-004 / GOV-007 / RPT-002 / VIEW-002

```yaml
date: 2026-07-04
milestone: NFR/GOV/RPT/VIEW
round_target: docs/superpowers/evolution/2026-07-04-round-target-r68.md
prd_ids: [NFR-003, NFR-004, GOV-007, RPT-002, VIEW-002]
ui_design_skill: none
status: design
```

## 1. 批量主题与子项映射

| # | 子项 | PRD ID | 模块 | 执行顺序 | 主攻薄弱维 | 用户感知 |
|---|------|--------|------|:--------:|------------|----------|
| 1 | dashboard_sla ACL/probe/alerts 深化 | NFR-003 | `core/nfr/dashboard_sla.py` | 1（hub **#1 84.2**） | 性能 **58%→≥88%**；完整度 **76%→≥90%** | 非法 dashboardId/threshold 被拦截；SLA probe/alerts 可回归 |
| 2 | https-audit mask-probe ACL/validate 深化 | NFR-004 | `core/nfr/https_audit.py` | 2（hub **#2 84.2**） | 性能 **58%→≥88%**；完整度 **76%→≥90%** | 非法 audit scope 被拦截；mask-probe 响应可探测 |
| 3 | gov bus auto-register FSM ACL/probe 深化 | GOV-007 | `governance/bus/` | 3（hub **#3 84.4**） | 性能 **58%→≥88%**；完整度 **76%→≥90%** | 越权与非法 FSM 转移可定位；auto-register probe 可回归 |
| 4 | prefab binding ACL/validate/probe 巩固 | RPT-002 | `reports/prefab/` | 4（边界 **90.0**） | 用户价值 **84%→≥88%**；性能 **88%→≥90%** | 非法 binding 被拦截；GET by key perf 可回归 |
| 5 | role default-views bounds/cycle ACL/probe 巩固 | VIEW-002 | `views/role_template.py` | 5（边界 **90.1**） | 用户价值 **84%→≥88%**；架构 **88%→≥90%** | 角色继承环与越权 GET 被拦截；bounds probe 可回归 |

**依赖链**：NFR-003 dashboard_sla probe/ACL/alerts 深化 → NFR-004 https-audit ACL/mask-probe → GOV-007 auto-register FSM/probe → RPT-002 prefab GET/ACL → VIEW-002 role cycle/ACL → `test_nfr_gov_rpt_view_r68.py` companion → r67 `test_dash_nfr_conn_rpt_r67` 34/34 + r66 `test_cat_dash_rpt_meta_r66` 33/33 + r65 `test_cat_rpt_meta_r65` 32/32 + r64 `test_nfr_cat_r64` 33/33 + r62 `test_cat_nfr_rpt_meta_r62` 32/32 + r60 `test_rpt_view_cat_gov_r60` 34/34 回归门控 198/198 → P5 三核心 ID 加权总分 **≥90**（破 STUCK）。

**上轮已交付（本轮不重复 L1 骨架）**：

| PRD | r60–r65 已有 | 本轮不重复 |
|-----|-------------|-----------|
| NFR-003 | `dashboard_sla` validate/probe/alerts mock（r62 L1 6 测） | 不重写 uptime mock 语义；不建真实 metrics store |
| NFR-004 | `https_audit` status/mask-probe 脱敏（r64 L1 6 测） | 不重写 ingress TLS；不建持久化审计 store |
| GOV-007 | auto-register FSM + 幂等 + integration/admin 角色（r60 L1 8 测） | 不重写 InMemoryBusAdapter；不补真实总线 HTTP |
| RPT-002 | prefab upsert/list/validate + r65 ACL/双 probe | 不重写 binding store 结构；不补 fe 预制 UI |
| VIEW-002 | role defaults PUT/GET + r63 bounds/resolve probe | 不重写内存 store 为 DB；不补 onboarding 继承链 |

**STUCK 说明**：NFR-003/NFR-004/GOV-007 各连续 1 轮（84.2–84.4）；本轮闭合 **性能 58%** 与 **完整度 76%**；目标加权总分 **≥90**。RPT-002/VIEW-002 为边界巩固，无 STUCK 计数。

**plan.md 状态**：M1+M1B 全 `[x]`；立项来源 `plan.archive.md` §NFR/GOV/RPT/VIEW；**禁止**修改 `plan.md` / `goal.md` 结构。

## 2. 现状与约束

| 项 | 现状（范围框定内已读） |
|----|------------------------|
| `dashboard_sla.py` | validate/probe/alerts mock；**无** ACL；**无** 域内 perf probe 函数；`dashboardId` 仅非空守卫；alerts 无 query 参数校验 |
| `https_audit.py` | status/mask-probe；**无** ACL；**无** 域内 perf probe；**无** `auditScope` 枚举守卫；`simulateAuditFailure` 降级未闭合 |
| `governance/bus/auto.py` | FSM draft→registering→succeeded/failed；**无** `failed` 后非法重试守卫；**无** probe；`get_fsm_state` 未暴露 HTTP |
| `reports/prefab/service.py` | r65 ACL + validate/list probe；**无** GET by key；**无** `get_binding` NOT_FOUND；list 无 enterprise scope |
| `views/role_template.py` | r63 `maxWidgetCount` bounds；**无** `inheritFromRoleId` 环检测；**无** enterprise GET scope；**无** put probe |
| `dashboard_first_screen.py`（参照） | r67：`set_user_*_scope` + 双 probe ≤50ms + enterprise 403 |
| `reports/prefab/probe.py`（参照） | r65：`probe_validate` + `probe_list` ≤50ms |
| `test_cat_nfr_rpt_meta_r62.py` | NFR-003 6 条 L1；**无** companion perf/ACL |
| `test_nfr_cat_r64.py` | NFR-004 6 条 L1；**无** companion perf/ACL |
| `test_rpt_view_cat_gov_r60.py` | GOV-007 8 条 L1；**无** companion probe/FSM 转移守卫 |
| `test_cat_rpt_meta_r65.py` | RPT-002 6 条 companion；**无** GET by key |
| `test_viz_view_design_cat_r63.py` | VIEW-002 6 条 companion；**无** role cycle / put probe |

**范围框定模块**（4 后端域 + 薄 entry）：`core/nfr/` · `governance/bus/` · `reports/prefab/` · `views/` + `api/v1` 薄 entry + pytest。

**范围框定文件列表**（18 ≤ 20）：

| 文件 | 子项 | 变更类型 |
|------|------|----------|
| `backend/app/core/nfr/dashboard_sla.py` | NFR-003 | 修改：ACL、`dashboardId` pattern、alerts threshold 守卫、双 probe 函数 |
| `backend/app/core/nfr/https_audit.py` | NFR-004 | 修改：ACL、`auditScope` 枚举、`simulateAuditFailure` 降级、双 probe 函数 |
| `backend/app/core/nfr/errors.py` | NFR-003/004 | 修改：`DASHBOARD_SLA_FORBIDDEN`、`DASHBOARD_SLA_INVALID_DASHBOARD_ID`、`HTTPS_AUDIT_FORBIDDEN`、`HTTPS_AUDIT_INVALID_SCOPE` |
| `backend/app/governance/bus/auto.py` | GOV-007 | 修改：`failed`/`auto_registering` 非法重试 409、enterprise entry path scope |
| `backend/app/governance/bus/probe.py` | GOV-007 | 新建：`probe_auto_register_budget_ms`（mock adapter inner） |
| `backend/app/reports/prefab/service.py` | RPT-002 | 修改：`get_prefab_binding`、list enterprise scope、duplicate dimensionCodes |
| `backend/app/reports/prefab/probe.py` | RPT-002 | 修改：`probe_get_prefab_binding_budget_ms` |
| `backend/app/reports/prefab/errors.py` | RPT-002 | 修改：`RPT_PREFAB_NOT_FOUND`、`RPT_PREFAB_DUPLICATE_DIMENSION` |
| `backend/app/views/role_template.py` | VIEW-002 | 修改：`inheritFromRoleId` 环检测、enterprise GET scope、`set_user_role_default_scope` |
| `backend/app/views/probe.py` | VIEW-002 | 修改：`probe_put_role_defaults_budget_ms` |
| `backend/app/api/v1/nfr.py` | NFR-003/004 | 修改：sla/mask-probe 路由传入 `UserContext`；alerts 可选 `thresholdPercent` query |
| `backend/app/api/v1/gov.py` | GOV-007 | 修改：薄 `GET /gov/bus/auto-register/probe` 或内联 probe 响应 |
| `backend/app/api/v1/reports/prefab.py` | RPT-002 | 修改：`GET /bindings/{binding_key}` + list actor 透传 |
| `backend/app/api/v1/views.py` | VIEW-002 | 修改：`read_role_default_views` 传入 actor 做 enterprise scope |
| `tests/test_nfr_gov_rpt_view_r68.py` | 全部 | 新建（≥32 条 companion 断言） |

**跨模块薄 entry 说明**：`nfr.py`/`gov.py`/`prefab.py`/`views.py` 仅 actor 透传与错误映射；业务逻辑留在四域框定内。

**真理源优先级**：`round-target` > `prd.md` hub + `F15-NFR` / `F10-GOV` / `F08-RPT` / `F09-VIEW` > `docs/services/` > `docs/api/README.md`。

**本轮性质**：r62/r64/r60 L1 + r65/r63 companion 后 **质量推分/巩固**；**纯后端**；`ui_design_skill: none`；不含 `fe/`、Admin 全量页面、真实 SLA metrics、PDF 全链路、M7 地域权限 fe、只读查询集成测、生产 TLS/真实审计 store。

## 3. 架构设计

### 3.1 目标增量结构

```
backend/app/core/nfr/
├── dashboard_sla.py      # NFR-003：ACL + dashboardId pattern + alerts 守卫 + 双 probe
├── https_audit.py        # NFR-004：ACL + auditScope + simulateAuditFailure + 双 probe
└── errors.py             # + FORBIDDEN / INVALID_* 常量

backend/app/governance/bus/
├── auto.py               # GOV-007：FSM 非法转移 + enterprise entry path scope
└── probe.py              # GOV-007：auto_register mock probe ≤50ms

backend/app/reports/prefab/
├── service.py            # RPT-002：get_binding + list scope + duplicate dimension
├── probe.py              # RPT-002：+ probe_get_binding
└── errors.py             # + NOT_FOUND / DUPLICATE_DIMENSION

backend/app/views/
├── role_template.py      # VIEW-002：inheritFromRoleId cycle + enterprise GET scope
└── probe.py              # VIEW-002：+ probe_put_role_defaults

backend/app/api/v1/
├── nfr.py                # sla/mask actor 透传
├── gov.py                # auto-register probe 薄路由
├── reports/prefab.py     # GET binding + list actor
└── views.py              # role defaults GET actor

tests/
└── test_nfr_gov_rpt_view_r68.py   # T-*-R68-xxx
```

**共享 companion 契约**（五子项均满足）：

| 契约项 | L1/r65/r63 已有 | r68 增量 |
|--------|----------------|----------|
| 结构化 `code` | 各域基础错误码 | 补 `DASHBOARD_SLA_FORBIDDEN` / `HTTPS_AUDIT_FORBIDDEN` / `GOV_AUTO_BUS_INVALID_TRANSITION` / `RPT_PREFAB_NOT_FOUND` / `VIEW_DEFAULT_ROLE_CYCLE` |
| 性能 smoke | 部分 HTTP 单测 | 各域 `probe_*_budget_ms` ≤ **50ms**（同进程 `time.perf_counter`，无真实网络/DB 外链） |
| ACL | GOV-007 integration/admin；prefab r65；VIEW admin PUT | enterprise scope + viewer 敏感读禁止（alerts/status 可选 viewer 可读，probe/validate 403） |
| 错误体 | `{code, message, detail}` | 403/404/409/422 含 `detail.fields`（校验类） |
| 内存 store | prefab/role defaults 进程内 dict | scope 注册函数供测试夹具 |
| 回归 | r60–r67 套件 | 198/198 全量门控不删旧套件 |

### 3.2 NFR-003 — dashboard_sla ACL/probe/alerts

#### 3.2.1 方案比选

| 方案 | 描述 | 取舍 |
|------|------|------|
| **A（推荐）** | 在 `dashboard_sla.py` 内增 ACL + probe + alerts query 守卫（对齐 r67 NFR-001） | 单文件锚点，省文件预算 |
| B | 新建 `dashboard_sla/probe.py` 子包 | 否决 — 横切模块不宜拆包 |
| C | 仅 pytest 计时不改 service | 否决 — 8 维性能维提升不足 |

#### 3.2.2 ACL 与边界闭合

| 规则 | 行为 | 错误码 |
|------|------|--------|
| `enterprise` 且 `dashboardId` 不在 scope 前缀 | 403 validate/probe | `DASHBOARD_SLA_FORBIDDEN` |
| `viewer` 调 alerts 且 `thresholdPercent` 试图覆盖 | 403（可选：viewer 只读 alerts 默认阈值） | `DASHBOARD_SLA_FORBIDDEN` |
| `dashboardId` 含空格或不符合 `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$` | 422 | `DASHBOARD_SLA_INVALID_DASHBOARD_ID` |
| `windowHours`/`slaTargetPercent` 越界（已有） | 422 | 既有 `DASHBOARD_SLA_*` |
| `GET alerts?thresholdPercent=` 越界 [90, 99.99] | 422 | `DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE`（新常量） |
| `simulateBreach`（已有） | 503 | `DASHBOARD_SLA_BELOW_TARGET` |
| 未知 dashboard scope（非 UUID 前缀场景） | 保持 pattern 守卫 | 不引入真实 dashboard 存在性查询 |

**Scope 注册**：`set_user_dashboard_sla_scope(user_id: str, dashboard_prefix: str)`，默认 `"sla-dash-"`。

**Probe 函数**（同文件）：

- `probe_validate_dashboard_sla_budget_ms(actor)` — 样例 payload 调 `validate_dashboard_sla`
- `probe_dashboard_sla_probe_budget_ms(actor)` — 样例 payload 调 `probe_dashboard_sla`

**Alerts 深化**：`get_dashboard_sla_alerts(threshold_percent: float | None = None)` — 可选覆盖阈值用于校验守卫；响应仍 mock channels。

#### 3.2.3 可测试验收标准（NFR-003）

- [ ] 两 probe 函数各 **< 50ms**
- [ ] enterprise 越权 `dashboardId` validate → 403 `DASHBOARD_SLA_FORBIDDEN`
- [ ] `dashboardId="bad id"` → 422 `DASHBOARD_SLA_INVALID_DASHBOARD_ID`
- [ ] `GET alerts?thresholdPercent=50` → 422 `DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE`
- [ ] r62 `T-NFR-R62-003-01~06` 回归全绿

### 3.3 NFR-004 — https-audit mask-probe ACL/validate

#### 3.3.1 ACL 与边界闭合

| 规则 | 行为 | 错误码 |
|------|------|--------|
| `enterprise` 且 `auditScope` 不在允许集合 | 403 mask-probe | `HTTPS_AUDIT_FORBIDDEN` |
| `auditScope` 非 `api`/`webhook`/`connector` | 422 | `HTTPS_AUDIT_INVALID_SCOPE` |
| `sensitiveFields` 含 unknown（已有） | 422 | `HTTPS_AUDIT_UNKNOWN_FIELD` |
| `webhookUrl` http（已有） | 422 | `HTTPS_AUDIT_INSECURE_URL` |
| `simulateAuditFailure: true`（新可选字段） | 200 `auditLogged=false` | 降级链闭合 |
| 空 payload（已有） | 422 | `HTTPS_AUDIT_EMPTY_PAYLOAD` |

**Scope 注册**：`set_user_https_audit_scope(user_id: str, allowed_scopes: frozenset[str])`，默认 `frozenset({"api", "webhook"})`。

**Schema 增量**：`HttpsAuditMaskProbeIn` 增 `audit_scope: str = Field(default="api", alias="auditScope")`、`simulate_audit_failure: bool = Field(default=False, alias="simulateAuditFailure")`。

**Probe 函数**：

- `probe_https_mask_budget_ms(actor)` — 样例 mask-probe
- `probe_https_status_budget_ms()` — 调 `get_https_audit_status`（无 ACL，纯 perf）

#### 3.3.2 可测试验收标准（NFR-004）

- [ ] 两 probe 函数各 **< 50ms**
- [ ] enterprise 越权 `auditScope=connector` → 403 `HTTPS_AUDIT_FORBIDDEN`
- [ ] `auditScope="invalid"` → 422 `HTTPS_AUDIT_INVALID_SCOPE`
- [ ] `simulateAuditFailure=true` → `auditLogged=false`
- [ ] r64 `T-NFR-R64-004-01~06` 回归全绿

### 3.4 GOV-007 — gov bus auto-register FSM ACL/probe

#### 3.4.1 方案比选

| 方案 | 描述 | 取舍 |
|------|------|------|
| **A（推荐）** | `bus/probe.py` + `auto.py` FSM 守卫 + enterprise catalog path scope | 对齐 prefab/entity_overview companion 惯例 |
| B | 新建 `bus/fsm.py` 独立模块 | 否决 — 超 file 预算且 r60 锚点在 auto.py |
| C | 仅 HTTP pytest 计时 | 否决 — 完整度不足 |

#### 3.4.2 FSM 与 ACL 闭合

| 规则 | 行为 | 错误码 |
|------|------|--------|
| `get_fsm_state(entry)==failed` 再次 auto-register | 409 | `GOV_AUTO_BUS_INVALID_TRANSITION` |
| `get_fsm_state(entry)==auto_registering` 并发重入 | 409 | `GOV_AUTO_BUS_INVALID_TRANSITION` |
| `enterprise` 且 catalog entry `path` 不在 scope 前缀 | 403 | `GOV_AUTO_BUS_FORBIDDEN`（复用） |
| `viewer`（已有） | 403 | `GOV_AUTO_BUS_FORBIDDEN` |
| `draft` entry（已有） | 400 | `GOV_AUTO_BUS_NOT_PUBLISHABLE` |
| entry 不存在（已有） | 404 | `CATALOG_ENTRY_NOT_FOUND` |
| force-fail path（已有） | 502 + fsm failed | `BUS_REGISTRATION_REJECTED` |

**Scope 注册**：`set_user_auto_bus_scope(user_id: str, path_prefix: str)`，默认 `"/api/v1/"`。

**Probe**：`probe_auto_register_budget_ms(db, actor, entry_id)` — `patch` `InMemoryBusAdapter.register` 为 no-op，测 `auto_register` 全流程 **< 50ms**（published entry fixture）。

**HTTP 薄增量**：`GET /api/v1/gov/bus/auto-register/probe` 返回 `{elapsedMs, withinBudget}`（integration/admin 可调；viewer 403）。

#### 3.4.3 可测试验收标准（GOV-007）

- [ ] `probe_auto_register_budget_ms()` **< 50ms**
- [ ] failed 状态重试 → 409 `GOV_AUTO_BUS_INVALID_TRANSITION`
- [ ] enterprise 越权 entry path → 403 `GOV_AUTO_BUS_FORBIDDEN`
- [ ] r60 `T-GOV-R60-007-01~08` 回归全绿（含 force-fail 502 路径）

### 3.5 RPT-002 — prefab binding ACL/validate/probe 巩固

#### 3.5.1 增量闭合

| 规则 | 行为 | 错误码 |
|------|------|--------|
| `GET /bindings/{key}` 不存在 | 404 | `RPT_PREFAB_NOT_FOUND` |
| `GET /bindings/{key}` enterprise scope 外 | 403 | `RPT_PREFAB_FORBIDDEN` |
| `dimensionCodes` 含重复项 | 422 | `RPT_PREFAB_DUPLICATE_DIMENSION` |
| `list_bindings` enterprise 仅返回 scope 内 key | 200 过滤列表 | 用户价值维闭合 |
| viewer PUT（r65 已有） | 403 | 保持 |
| analysisType/dimension 联动（r65 已有） | 422 | 保持 |

**Probe 增量**：`probe_get_prefab_binding_budget_ms(key)` — 预置 store 后调 `get_prefab_binding`。

**HTTP**：新增 `GET /api/v1/reports/prefab/bindings/{binding_key}`；`list_bindings` 传入 actor 做 scope 过滤。

#### 3.5.2 可测试验收标准（RPT-002）

- [ ] `probe_get_prefab_binding_budget_ms` **< 50ms**
- [ ] 未知 binding key GET → 404 `RPT_PREFAB_NOT_FOUND`
- [ ] enterprise scope 外 GET → 403 `RPT_PREFAB_FORBIDDEN`
- [ ] 重复 `dimensionCodes` validate → 422 `RPT_PREFAB_DUPLICATE_DIMENSION`
- [ ] r65 `T-RPT-R65-002-01~06` 回归全绿

### 3.6 VIEW-002 — role default-views bounds/cycle ACL/probe

#### 3.6.1 增量闭合

| 规则 | 行为 | 错误码 |
|------|------|--------|
| `inheritFromRoleId` 形成角色链环 | 422 | `VIEW_DEFAULT_ROLE_CYCLE` |
| `enterprise` GET 非 scope 内 `role_id` | 403 | `VIEW_DEFAULT_FORBIDDEN`（复用） |
| `maxWidgetCount` 越界（r63 已有） | 422 | `VIEW_DEFAULT_OUT_OF_BOUNDS` |
| admin PUT（r60 已有） | 200 | 保持 |
| viewer PUT（r60 已有） | 403 | 保持 |
| dashboard/report NOT_FOUND（r60 已有） | 404 | 保持 |

**环检测算法**：`put_defaults` 接受可选 `inheritFromRoleId`；沿 `store` 中已存 defaults 的 `inheritFromRoleId` 链 DFS，遇重复 `role_id` → cycle。无 `inheritFromRoleId` 时跳过。

**Scope 注册**：`set_user_role_default_scope(user_id: str, role_prefix: str)`，默认 `"role-"`。

**Probe**：`probe_put_role_defaults_budget_ms(db, actor, role_id, payload)` — 最小合法 payload（仅 `dashboardId`）测 PUT 编排 **< 50ms**（mock 或 sqlite fixture dashboard）。

#### 3.6.2 可测试验收标准（VIEW-002）

- [ ] `probe_put_role_defaults_budget_ms` **< 50ms**
- [ ] `inheritFromRoleId` A→B→A → 422 `VIEW_DEFAULT_ROLE_CYCLE`
- [ ] enterprise 越权 `role_id` GET → 403 `VIEW_DEFAULT_FORBIDDEN`
- [ ] r63 `T-VIEW-R63-002-01~06` + r60 `T-VIEW-R60-002-01~06` 回归全绿

## 4. 测试策略

### 4.1 新测文件 `tests/test_nfr_gov_rpt_view_r68.py`

| 区块 | 断言数（约） | 覆盖 |
|------|:-----------:|------|
| Fixture bootstrap | 2 | sqlite env + health |
| NFR-003 | 7 | probe×2、ACL、invalid dashboardId、alerts threshold、回归指针 |
| NFR-004 | 7 | probe×2、ACL、invalid scope、simulateAuditFailure、回归指针 |
| GOV-007 | 7 | probe、FSM invalid transition、enterprise scope、force-fail 保持、回归指针 |
| RPT-002 | 6 | probe get、GET NOT_FOUND、GET ACL、duplicate dimension、回归指针 |
| VIEW-002 | 6 | probe put、role cycle、enterprise GET ACL、回归指针 |
| **合计** | **≥35** | 满足 round-target ≥32 |

**命名**：`T-NFR-R68-003-xxx` · `T-NFR-R68-004-xxx` · `T-GOV-R68-007-xxx` · `T-RPT-R68-002-xxx` · `T-VIEW-R68-002-xxx`。

**Fixture**：module-scoped sqlite memory DB（`nfr_gov_rpt_view_r68`）；`enterprise_user` / `viewer_user` / `integration_user` dependency override 与 r67 一致；prefab/role defaults store 在 teardown 清理。

### 4.2 回归门控（P4 必跑）

| 套件 | 断言 |
|------|------|
| `test_nfr_gov_rpt_view_r68.py` | ≥32/32 |
| `test_dash_nfr_conn_rpt_r67.py` | 34/34 |
| `test_cat_dash_rpt_meta_r66.py` | 33/33 |
| `test_cat_rpt_meta_r65.py` | 32/32 |
| `test_nfr_cat_r64.py` | 33/33 |
| `test_cat_nfr_rpt_meta_r62.py` | 32/32 |
| `test_rpt_view_cat_gov_r60.py` | 34/34 |
| **合计** | **198/198** |

全量：`cd backend && python3 -m ruff check . && python3 -m pytest -q` exit_code **0**。

## 5. PRD 8 维薄弱项对齐

| PRD ID | 选题分 | 最薄弱维 | r68 设计闭合点 | P5 目标维 |
|--------|:------:|----------|----------------|-----------|
| NFR-003 | 84.2 | 性能 58%、完整度 76% | validate/probe 双 probe、enterprise scope、dashboardId pattern、alerts threshold | 性能→≥88%、完整度→≥90%、总分 **≥90** |
| NFR-004 | 84.2 | 性能 58%、完整度 76% | mask/status 双 probe、auditScope ACL/validate、simulateAuditFailure | 同上 |
| GOV-007 | 84.4 | 性能 58%、完整度 76% | auto_register probe、FSM invalid transition、enterprise path scope | 同上 |
| RPT-002 | 90.0 | 用户价值 84%、性能 88% | GET by key NOT_FOUND/ACL、duplicate dimension、get probe | 用户价值→≥88%、性能→≥90%、巩固 **≥90** |
| VIEW-002 | 90.1 | 用户价值 84%、架构 88% | role inherit cycle、enterprise GET scope、put probe | 用户价值→≥88%、架构→≥90%、巩固 **≥90** |

**P5 目标**：NFR-003/NFR-004/GOV-007 加权总分 **≥90.0**（破 STUCK）；RPT-002/VIEW-002 巩固 **≥90**；测试覆盖维持 **≥98%**（新增 ≥32 断言 + 198 回归）。

## 6. 非目标（明确不做）

- Admin / `fe/` 全量页面、仪表板 SLA 可视化、HTTPS 审计 Admin UI
- `tests/perf/` 真实 SLA metrics 采集、生产 PagerDuty 告警联动
- 真实总线 HTTP 对接、失败重试/熔断、publish 引擎全链路
- PDF/Word 预制报表 fe 选择与 M3-LITE 执行链
- 新用户 onboarding 自动继承、role defaults DB 持久化
- M7 地域 RLS、生产 TLS 终止、持久化审计 store
- CAT-001/CAT-002 等同分 90.0 用户价值维 companion（留后续轮）
- 修改 `docs/automate/goal.md` 或 `plan.md` 结构

## 7. 文档同步（P3/P5）

| 变更 | 文档 |
|------|------|
| dashboard_sla / https_audit companion | `docs/services/core.md` 或 NFR 横切登记 |
| gov bus auto-register FSM/probe | `docs/services/governance.md` |
| prefab GET/ACL 深化 | `docs/services/reports.md` |
| role defaults cycle/scope | `docs/services/views.md`（或等效域附录） |
| 新增 GET prefab binding、gov probe 路由 | `docs/api/README.md` 补登记行 |
| 验收勾选 | `docs/automate/prd/F15-NFR.md` · `F10-GOV.md` · `F08-RPT.md` · `F09-VIEW.md` |

## 8. UI 设计交付

**`ui_design_skill`**: `none`（本轮纯后端，不触及 `fe/` 或 `*.tsx`）

本轮无前端门控；P2/P3/P4 Task 均标注 `UI skill: none`。

## 9. Self-review 清单

- [x] 覆盖 round-target 五子项，无 TBD/TODO
- [x] 文件列表 18 ≤ 20，未超出范围框定模块
- [x] 每项含可测试验收标准与 perf ≤50ms 契约
- [x] 回归门控 198/198 与 r68 ≥32 测明确
- [x] 非目标与 8 维对齐已列
- [x] 未写生产代码

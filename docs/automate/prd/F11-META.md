# F11-META 元数据语义层

> 模块：M1 · 8 维评分见 [`../prd.md`](../prd.md)

### [META-001] 术语字典

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：术语字典（SRS 追溯项）。
- **验收标准**：
  - [x] 业务术语 CRUD（r32 L1：`GlossaryTerm` + `POST/GET/PUT/DELETE /api/v1/metadata/glossary`）
  - [ ] 与物理字段映射
- **代码锚点**：`backend/app/metadata/glossary/` · `backend/app/api/v1/metadata.py`
- **演化建议**：r33 闭合 definition/name 边界、status 枚举与 list perf smoke（T-META-R33-001-01~04）；后续补物理字段映射与 Admin UI
- **里程碑对齐**：
### [META-002] 业务主题树

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：业务主题树（SRS 追溯项）。
- **验收标准**：
  - [x] 主题→对象→属性树（r32 L1：`ThemeNode` 多级 parent + `term_id` 关联）
  - [ ] 可导航（缺 Admin 树形 UI；API `?parent_id=` 过滤 + move 环检测已 L1）
- **代码锚点**：`backend/app/metadata/themes/` · `backend/app/api/v1/metadata.py`
- **演化建议**：r33 闭合 MAX_DEPTH=8、move 深度合法性与 children list perf（T-META-R33-002-01~03）；后续 Admin 主题树导航
- **里程碑对齐**：
### [META-003] 维度字典注册

- **状态**：部分实现（L1 kickoff r38 + companion r39）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：维度字典注册（SRS 追溯项）。
- **验收标准**：
  - [x] 维度 code/枚举值可配置（migration 0016 + 8 REST 路由 CRUD/values；`META_DIM_*` 冲突与校验，r38 L1）
  - [x] values 注册校验链（空 code/非法 pattern/重复 batch/空 label + list 分页 limit 500，r39）
  - [ ] M4/M5/M6 统一引用
- **代码锚点**：`backend/app/metadata/dimensions/` · `backend/app/api/v1/metadata_dimensions.py` · `tests/test_query_meta_conn_r38.py` T-META-R38-003-01~07 · `tests/test_query_meta_conn_r39.py` T-META-R39-003-01~06
- **演化建议**：r39 闭合 values 校验与分页边界；后续接 M4/M5/M6 统一引用与 Admin 维度管理 UI
- **里程碑对齐**：
### [META-004] Dataset CRUD M1-DATASET

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：Dataset CRUD M1-DATASET（SRS 追溯项）。
- **验收标准**：
  - [ ] Dataset 对标 DE/SS
  - [ ] 计算字段/指标
- **代码锚点**：`backend/app/metadata/dataset/`
- **演化建议**：按 plan.md 期次优先级落地
### [META-005] 物理表元数据登记 M1-ENTITY

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：物理表元数据登记 M1-ENTITY（SRS 追溯项）。
- **验收标准**：
  - [ ] 物理表/字段登记
  - [ ] 支撑 FR-6.2
- **代码锚点**：`backend/app/metadata/entity/`
- **演化建议**：按 plan.md 期次优先级落地
### [META-006] 实体类型 schema 配置

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体类型 schema 配置（SRS 追溯项）。
- **验收标准**：
  - [x] 实体属性/生命周期可配置（attributes + lifecycleStates 默认 draft/active/retired）
  - [x] 不预置业务实体（内存 store，按需创建）
  - [x] schema 校验链 + 只读 query bindings（r55 companion：POST validate + GET query-bindings）
  - [ ] 物理表映射与 GOV 引用释放
- **代码锚点**：`backend/app/metadata/entity/` · `backend/app/api/v1/metadata.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-META-01~07 · `tests/test_rpt_gov_meta_conn_r55.py` T-META-R55-01~08
- **演化建议**：r55 companion 闭合 duplicate attributes/lifecycle 校验、json 不可筛选守卫、entity-in-use 409 与 probe <200ms；后续补物理表映射

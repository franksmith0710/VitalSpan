# F05-QUERY 查询引擎

> 模块：M3 · 8 维评分见 [`../prd.md`](../prd.md)

### [QUERY-001] M3-LITE SQL 只读执行

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：M3-LITE SQL 只读执行（SRS 追溯项）。
- **验收标准**：
  - [ ] POST `/api/v1/query/execute` 返回结果集
  - [ ] 强制 LIMIT
- **代码锚点**：`backend/app/query/executor.py`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-002] 物理表 mode=table 查询

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：物理表 mode=table 查询（SRS 追溯项）。
- **验收标准**：
  - [ ] 指定 tableName 可查询
  - [ ] 标识符转义正确
- **代码锚点**：`backend/app/query/table.py`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-003] Native 查询双路径

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：Native 查询双路径（SRS 追溯项）。
- **验收标准**：
  - [ ] 时序/文档/搜索走 native
  - [ ] 不做 SQL 伪装
- **代码锚点**：`backend/app/query/native/`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-004] SQL 方言适配器

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：SQL 方言适配器（SRS 追溯项）。
- **验收标准**：
  - [ ] MySQL/PG/ClickHouse 方言适配
  - [ ] LIMIT/标识符转义
- **代码锚点**：`backend/app/query/dialects/`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-005] 图表直连绑定 FR-2.0b

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：图表直连绑定 FR-2.0b（SRS 追溯项）。
- **验收标准**：
  - [ ] 组件绑定 dataSourceId+SQL/表
  - [ ] 不经 Dataset
- **代码锚点**：`backend/app/query/binding.py`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-006] RLS 注入执行链

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：RLS 注入执行链（SRS 追溯项）。
- **验收标准**：
  - [ ] 执行前合并 AUTH-007 谓词
  - [ ] 越权返回空集或 403
- **代码锚点**：`backend/app/query/rls.py`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-007] 配置元模型存储

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：配置元模型存储（SRS 追溯项）。
- **验收标准**：
  - [ ] 可视化配置可入库
  - [ ] 配置版本可追溯
- **代码锚点**：`backend/app/query/models/`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-008] 配置→SQL/API 翻译器

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：配置→SQL/API 翻译器（SRS 追溯项）。
- **验收标准**：
  - [ ] DSL/JSON 生成可执行 SQL
  - [ ] 参数化防注入
- **代码锚点**：`backend/app/query/translator/`
- **演化建议**：按 plan.md 期次优先级落地
### [QUERY-009] Dataset 查询路径

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：Dataset 查询路径（SRS 追溯项）。
- **验收标准**：
  - [ ] datasetId 查询可走通
  - [ ] 仅授权 Dataset
- **代码锚点**：`backend/app/query/dataset/`
- **演化建议**：按 plan.md 期次优先级落地

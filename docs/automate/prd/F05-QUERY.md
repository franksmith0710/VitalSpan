# F05-QUERY 查询引擎

> 模块：M3 · 8 维评分见 [`../prd.md`](../prd.md)

### [QUERY-001] M3-LITE SQL 只读执行

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：M3-LITE SQL 只读执行（SRS 追溯项）。
- **验收标准**：
  - [x] POST `/api/v1/query/execute` 返回结果集
  - [x] 强制 LIMIT
- **代码锚点**：`backend/app/query/executor.py` · `backend/app/api/v1/query.py`
- **演化建议**：r27 加固只读守卫（注释剥离、多语句/内联写拒绝、64KB 上限）与 P95 smoke；后续可补查询超时细粒度与生产 P95 基准
- **里程碑对齐**：
### [QUERY-002] 物理表 mode=table 查询

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：物理表 mode=table 查询（SRS 追溯项）。
- **验收标准**：
  - [x] 指定 tableName 可查询
  - [x] 标识符转义正确
- **代码锚点**：`backend/app/query/table.py` · `backend/app/query/executor.py`
- **演化建议**：r27 补空结果集、分页上限、非法标识符与超时结构化响应；后续可补跨 schema 浏览联动
- **里程碑对齐**：
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

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：SQL 方言适配器（SRS 追溯项）。
- **验收标准**：
  - [x] MySQL/PostgreSQL/ClickHouse 方言适配
  - [x] LIMIT/标识符转义
- **代码锚点**：`backend/app/query/dialects/` · `backend/app/query/dialects/clickhouse.py`
- **演化建议**：r27 交付 ClickHouse L1（标识符、LIMIT/OFFSET、table select）与执行错误映射；后续可补更多 OLAP 类型映射
- **里程碑对齐**：
### [QUERY-005] 图表直连绑定 FR-2.0b

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：图表直连绑定 FR-2.0b（SRS 追溯项）。
- **验收标准**：
  - [x] 组件绑定 dataSourceId+SQL/表
  - [x] 不经 Dataset
- **代码锚点**：`backend/app/query/binding_service.py` · `backend/app/query/models.py`
- **演化建议**：r27 加固 chartId 唯一冲突检测、并发 PATCH 与软删后不可见；预览 API 与设计器 UI 待 M5+
- **里程碑对齐**：
### [QUERY-006] RLS 注入执行链

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：RLS 注入执行链（SRS 追溯项）。
- **验收标准**：
  - [x] 执行前合并 AUTH-007 谓词
  - [x] 越权返回空集或 403
- **代码锚点**：`backend/app/query/rls/guard.py` · `backend/app/query/service.py`
- **演化建议**：r27 补 admin bypass、多维谓词合并与 ClickHouse 执行链集成 smoke；生产环境禁止 `rls.enabled=false`
- **里程碑对齐**：
### [QUERY-007] 配置元模型存储

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：配置元模型存储（SRS 追溯项）。
- **验收标准**：
  - [x] 可视化配置可入库（r32 L1：`QueryConfigRecord` JSON upsert + `POST/GET /api/v1/query-configs`）
  - [x] 配置版本可追溯（`revision` 递增 + `updated_at`；同 ref 幂等 upsert）
- **代码锚点**：`backend/app/query/config_store/` · `backend/app/api/v1/query_configs.py`
- **演化建议**：r33 闭合 256KB payload 上限、expectedRevision 409 乐观锁与大配置 round-trip perf（T-QUERY-R33-007-01~03）；后续接 QUERY-008 翻译器
- **里程碑对齐**：
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

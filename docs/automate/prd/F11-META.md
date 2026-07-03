# F11-META 元数据语义层

> 模块：M1 · 8 维评分见 [`../prd.md`](../prd.md)

### [META-001] 术语字典

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：术语字典（SRS 追溯项）。
- **验收标准**：
  - [ ] 业务术语 CRUD
  - [ ] 与物理字段映射
- **代码锚点**：`backend/app/metadata/glossary/`
- **演化建议**：按 plan.md 期次优先级落地
### [META-002] 业务主题树

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：业务主题树（SRS 追溯项）。
- **验收标准**：
  - [ ] 主题→对象→属性树
  - [ ] 可导航
- **代码锚点**：`backend/app/metadata/themes/`
- **演化建议**：按 plan.md 期次优先级落地
### [META-003] 维度字典注册

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：维度字典注册（SRS 追溯项）。
- **验收标准**：
  - [ ] 维度 code/枚举值可配置
  - [ ] M4/M5/M6 统一引用
- **代码锚点**：`backend/app/metadata/dimensions/`
- **演化建议**：按 plan.md 期次优先级落地
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

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体类型 schema 配置（SRS 追溯项）。
- **验收标准**：
  - [ ] 实体属性/生命周期可配置
  - [ ] 不预置业务实体
- **代码锚点**：`backend/app/metadata/entity/types/`
- **演化建议**：按 plan.md 期次优先级落地

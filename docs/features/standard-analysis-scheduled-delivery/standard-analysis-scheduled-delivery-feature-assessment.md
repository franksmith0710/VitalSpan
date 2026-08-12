# 标准分析定时投递 迭代评估报告

> 持续追踪文档 · 最近更新 2026-08-12 · 当前第 1 轮

## 本轮摘要

| 项目 | 内容 |
|------|------|
| 当前分数 | 8.0 / 10（基线；分数仅作趋势参考，交付判定见「可交付门槛」） |
| 当前决策 | 模块级可验收；全链路 SMTP 真投递待补验 |
| 最大阻塞 | ISSUE-002：执行链未验真 PDF 生成与 SMTP 全链路 |
| 下一步动作 | 隐藏标准分析无关的 Playwright 健康提示 → 补 1 条非 mock 导出测 → staging SMTP 试发签收 |
| 验证状态 | 部分验证（pytest 3 + vitest 1 绿；无 staging 真机投递） |

---

## 🎯 迭代目标

### 核心目标

在标准分析包（`packKey`）上复用 RPT-005 调度与多渠道投递，使用户可在配置页设定 Cron、收件人与投递方式（邮件/企微/钉钉），周期生成多主题 PDF 并投递；与周期快照 job 分离、互不影响。

### 产品动因

标准分析工作台已有运行与对比能力，但缺少面向决策人的**主动推送**通道。政企场景需要按周/月将分析结论 PDF 投递给管理层，而不必登录平台查看。

### 可度量的成功指标

| 指标ID | 指标 | 目标值 | 度量方式 |
|--------|------|--------|----------|
| G1 | 配置页可创建并激活 standard 调度（含三通道勾选） | 管理员 3 步内完成 | 配置页走查 + vitest smoke |
| G2 | 试发/定时执行后在调度中心可见历史 | 执行记录含 `deliverySteps` | API pytest + 调度页走查 |
| G3 | 未配 SMTP 时禁止假成功 | 状态 `unconfigured` 或失败可读 | 无 SMTP 环境执行 + 断言状态 |
| G4 | 周期快照 job 与投递调度独立 | 快照仍按 preset 写库，投递不覆盖 | 代码边界 + `standard/jobs.py` 无投递调用 |
| G5 | PDF 产物非空且含已启用主题 | 导出 bytes > 0；主题数 = enabledThemes | 非 mock 集成测或 staging 下载附件 |

### 里程碑路径

| 里程碑 | 描述 | 对应指标/门槛 |
|--------|------|--------------|
| M1 | 模型 + API `sourceType=standard` / `sourceKey` | G1 · DG1 |
| M2 | executor 导出 + 投递分支 | G2 · G5 · DG2 |
| M3 | FE `StandardSchedulePanel` 嵌入配置页 | G1 · DG3 |
| M4 | 文档/测试 + 调度列表来源展示 | G2 · DG4 |
| M5 | staging SMTP 真投递签收 | G3 · G5 · DG5 |

---

## 🧭 产品决策记录

### D1：标准分析投递是否展示 Playwright 导出健康检查

- **状态**：🟡 待确认
- **背景**：`StandardSchedulePanel` 复用 `ScheduleFormFields`，默认渲染 `ScheduleExportHealthAlert`（Playwright PDF），而标准分析走 `render_document` reportlab 路径，与 Playwright 无关（`ScheduleFormFields.tsx:214-217`）。
- **选项对比**：

| 选项 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A.（推荐）** | 标准分析面板传 `hideStandaloneHealthAlerts` 或仅保留 SMTP 健康 | 文案准确，减少误阻断 | 需区分 sourceType 的表单 props |
| B. | 保持与看板一致，共用健康块 | 实现零改动 | 管理员可能误以为需 Playwright |
| C. | 新增「分析包数据就绪」预检块 | 对齐计划「精简预检」 | 额外 FE 工作量 |

- **影响范围**：`StandardSchedulePanel.tsx` · `ScheduleFormFields.tsx`
- **确认记录**：（待填写：确认人 / 日期 / 选定选项）

---

## 🚦 可交付门槛

### 门槛清单

| 门槛ID | 条件 | 验证方式 | 当前状态 |
|--------|------|----------|----------|
| DG1 | G1：后端契约（迁移 + schema + 列表/创建/执行 API） | `pytest tests/test_standard_schedule_delivery.py` | ✅ 通过（2026-08-12，3 passed） |
| DG2 | G1：配置页嵌入投递 UI | `vitest standard-schedule.smoke.test.tsx` + 配置页走查 | ✅ 通过（2026-08-12，1 passed） |
| DG3 | G5：非 mock 导出 PDF bytes 非空 | 集成测或 staging 下载 | ❌ 未达成 |
| DG4 | PRD / services / api 文档同步 | 文档对账 | ✅ 通过 |
| DG5 | G3：未配 SMTP 无假成功（standard 路径） | 无 SMTP 执行断言 `unconfigured`/失败 | ⚠️ 部分（沿用 RPT-005 全局行为，无 standard 专项测） |

### 轮次执行纪律

1. 每轮 P0 必须服务于未达成 DG 项
2. 偏离须在「本轮范围」登记
3. 代码写完 ≠ 达成；以度量方式实际执行过为准
4. 单一记账：G 定义在此、快照在达成度表、交付在 DG 表、问题在台账

---

## 📊 迭代概览

### 评分趋势

| 轮次 | 日期 | 综合分 | 功能 | 体验 | 质量 | 稳定 | 性能 | 迭代友好 | 关键变化 |
|------|------|--------|------|------|------|------|------|---------|---------|
| **R1** | 2026-08-12 | **8.0** | 9 | 7 | 8 | 8 | 7 | 8 | 首评：方案全量落地，真投递未验 |

### 趋势图（文字版）

```
综合分  R1: ████████░░ 8.0  (基线)
```

### 累计已解决问题

（首轮，暂无）

### 仍待解决问题

| 问题ID | 严重度 | 来源 | 状态 | 问题 | 影响 | 下一步 | 目标轮次 |
|--------|--------|------|------|------|------|--------|----------|
| ISSUE-001 | P2 | R1 提出 | 未解决 | 标准分析投递表单展示 Playwright 导出健康 Alert，与 reportlab 路径无关（`ScheduleFormFields.tsx:214-217`） | 管理员误判环境依赖，可能放弃创建 | 待 D1 确认后传 `hideStandaloneHealthAlerts` 或拆分健康块 | R2 |
| ISSUE-002 | P2 | R1 提出 | 未解决 | 执行测试 mock 了 `export_standard_attachments`，未验真 PDF bytes（`test_standard_schedule_delivery.py:174`） | DG3 无法勾选；回归可能漏导出回归 | 补 1 条非 mock 集成测（种子表 + run） | R2 |
| ISSUE-003 | P2 | R1 提出 | 未解决 | 调度中心页描述仅写看板/大屏，未含标准分析（`ReportSchedulesPage.tsx:198`） | 用户不知可在该页看到 standard 来源 | 改 description 或 Tab 文案 | R2 |
| ISSUE-004 | P2 | R1 提出 | 未解决 | `docs/arch.md` Alembic head 仍登记 0041，实际已有 `0046` | 部署/迁移文档误导 | 同步 arch + data README head | R2 |
| ISSUE-005 | P2 | R1 提出 | 未解决 | 无分析包物理表/主题就绪的精简预检（计划可选项未做） | 创建后首次执行才暴露数据问题 | 待 D1 选项 C 或运行时错误文案优化 | R3 |

---

## 🔍 当前轮次评估（第 1 轮）

**评估时间**：2026-08-12  
**综合评分**：**8.0 / 10**  
**评估结论**：方案规定的后端、前端、文档与自动化测试均已落地，可作为模块验收基线；全链路真投递与部分 UX 细节尚待 R2 收口。

### 本轮范围

**评估范围：**
- 标准分析定时投递全栈实现（迁移 0046、scheduler、FE 面板、文档、测试）
- 与 RPT-005 看板/模板投递链路的复用程度

**不评估范围：**
- 看板 Playwright PDF 既有能力
- 标准分析工作台主题渲染质量（属 RPT-002 主体）
- staging 环境 SMTP 真机（本轮未执行）

### 目标对齐

首轮：指标见 `## 🎯 迭代目标`。

#### 目标达成度表

| 指标ID | 指标 | 目标值 | 当前值 | 达成度 | 阻塞项 |
|--------|------|--------|--------|--------|--------|
| G1 | 配置页创建/激活 standard 调度 | 3 步内完成 | UI 已嵌入 + smoke 绿 | 代码已实现，未实操验证 | — |
| G2 | 调度中心可见执行历史 | 含 deliverySteps | pytest mock 投递通过 | 部分达成（API 层） | ISSUE-002 |
| G3 | 未配 SMTP 禁止假成功 | unconfigured/失败可读 | 复用 RPT-005 全局逻辑 | 未启动（无 standard 专项测） | DG5 |
| G4 | 快照与投递独立 | 互不影响 | `standard/jobs.py` 无 dispatch | 已达成 | — |
| G5 | PDF 非空含启用主题 | bytes > 0 | 仅 mock 返回假 PDF | 未启动 | ISSUE-002 · DG3 |

**达成度判定**：1/5 项指标达成（G4），2 项部分/代码就绪未实操验证，核心阻塞 2 个（真 PDF、SMTP 签收），本轮判定为**稳步推进、未达可对外交付门槛**。

### 现状概览

**已实现能力：**
- ✅ Alembic `0046`：`report_schedules.source_key`，`source_id` 可空
- ✅ API：`sourceType=standard` + `sourceKey` 创建/列表/校验（`scheduler/schemas.py` · `api/v1/reports/__init__.py`）
- ✅ 执行器：`semi_real_execute_schedule` standard 分支 → `standard_export.py` → `dispatch_artifact`
- ✅ 邮件模板：`delivery_adapter.py` 支持 `standard_render`
- ✅ FE：`StandardSchedulePanel` 嵌入 `StandardAnalysisConfigPage`；工作台「投递设置」深链；`scheduleSourceMeta` 标准分析来源
- ✅ 测试：`test_standard_schedule_delivery.py`（3）· `standard-schedule.smoke.test.tsx`（1）
- ✅ 文档：`F08-RPT.md` · `reports.md` · `api/README.md` 已同步

**明确不做（本期，已遵守）：**
- 飞书等新通道；合并 snapshot job；Celery 队列化

### 六维评分

| 维度 | 权重 | 得分 | 加权分 | 一句话评价 |
|------|------|------|--------|-----------|
| 功能完整度 | 25% | 9 | 2.3 | 计划 5 todo 全落地，仅可选预检与 companion 扩展未做 |
| 用户体验 | 20% | 7 | 1.4 | 复用调度表单一致性好，但 Playwright 提示误导（ISSUE-001） |
| 代码质量 | 20% | 8 | 1.6 | 清晰复用 RPT-005，边界分离；测覆盖偏 mock（ISSUE-002） |
| 稳定性 | 15% | 8 | 1.2 | 导出失败走 `semi_real_failed`，无静默成功路径 |
| 性能效率 | 10% | 7 | 0.7 | 多主题串行 run，大包可能慢；M1 可接受 |
| 迭代友好度 | 10% | 8 | 0.8 | `sourceKey` 扩展不破坏 template/dashboard 既有模型 |
| **综合** | 100% | — | **8.0** | — |

#### 雷达图（文字版）

```
功能完整度  █████████░ 9/10
用户体验    ███████░░░ 7/10
代码质量    ████████░░ 8/10
稳定性      ████████░░ 8/10
性能效率    ███████░░░ 7/10
迭代友好度  ████████░░ 8/10
```

### 优点分析

#### ✅ 复用 RPT-005 而非平行造轮子
- **是什么**：扩展 `sourceType=standard` + `sourceKey`，执行与投递走既有 FSM、APScheduler、`deliver_to_channels`。
- **为什么好**：降低维护成本，调度中心/失败重试/多渠道行为与看板一致。
- **代码佐证**：`backend/app/reports/scheduler/executor.py:321-327` · `service.py:126-137`

#### ✅ 快照与投递职责分离清晰
- **是什么**：`standard/jobs.py` 周期快照仅写库供对比；用户可配投递独立存在。
- **为什么好**：避免「对比上期」与「对外邮件」混为一谈，符合 PRD 边界。
- **代码佐证**：`docs/services/reports.md` 边界表 · `standard/jobs.py`（无 dispatch 调用）

#### ✅ 前端嵌入点合理
- **是什么**：配置页编辑已有包时展示 `StandardSchedulePanel`；路由 `report:manage` 门禁。
- **为什么好**：投递配置与数据绑定同屏，减少上下文切换。
- **代码佐证**：`StandardAnalysisConfigPage.tsx` · `routes.tsx:217`

### 问题分析

**本轮状态有变化的问题：**（首轮即全部新增）

##### ISSUE-001：Playwright 健康提示不适用于标准分析
- **来源**：R1 新增（code-reviewer 同源）
- **状态**：未解决
- **现象**：创建投递时展示「Playwright PDF 导出服务」健康检查。
- **影响**：用户误以为标准分析依赖无头浏览器。
- **根因**：`ScheduleFormFields` 默认 `hideStandaloneHealthAlerts=false`，未按 sourceType 区分。
- **证据**：`fe/src/pages/admin/reports/components/ScheduleFormFields.tsx:214-217`
- **建议**：`StandardSchedulePanel` 传 `hideStandaloneHealthAlerts` 或仅渲染 SMTP 健康（见 D1 选项 A）。
- **验收标准**：标准分析配置页不出现 Playwright 相关文案。

##### ISSUE-002：缺少非 mock 的 PDF 导出验证
- **来源**：R1 新增
- **状态**：未解决
- **现象**：`test_standard_schedule_execute_with_mock_delivery` patch 了导出函数。
- **影响**：`render_document` / 多主题合并回归无守护；DG3 未达成。
- **根因**：集成测成本高，首轮优先验证调度+投递编排。
- **证据**：`tests/test_standard_schedule_delivery.py:174-182`
- **建议**：补 1 条直接调用 `export_standard_attachments` 或完整 execute 无 patch 的用例。
- **验收标准**：断言返回 PDF magic bytes 且 `len(attachments[0][0]) > 100`。

**本轮无变化的问题：** 无（首轮）

**本轮新增问题：** 另见台账 ISSUE-003～005（文案/文档/预检，均为 P2）。

### 迭代方向建议

#### 下一轮前置条件

- [ ] D1：标准分析投递健康检查展示策略

#### 下一轮优先级

| 优先级 | 目标 | 对应问题/门槛 | 依赖决策 | 预期效果 |
|--------|------|--------------|----------|----------|
| P0 | staging SMTP 试发签收 | DG5 · G3 | — | 真投递可宣称 |
| P1 | 非 mock PDF 集成测 | ISSUE-002 · DG3 | — | 导出回归有保障 |
| P1 | 隐藏/修正 Playwright 健康提示 | ISSUE-001 · D1 | D1 选项 A | 配置体验准确 |
| P2 | 调度页文案含标准分析 | ISSUE-003 | — | IA 一致 |
| P2 | arch head 同步 0046 | ISSUE-004 | — | 部署文档准确 |

#### 验收标准

- [ ] DG3、DG5 转为 ✅
- [ ] G5 当前值为「staging 附件可下载且非空」

### 评估结论

标准分析定时投递在工程上已完成方案规定的全部交付物，架构上正确复用 RPT-005，与快照 job 边界清晰。综合分 8.0 反映「功能齐全、验证未闭环」：自动化测试覆盖了 API 契约与 FE smoke，但真 PDF 生成与 SMTP 全链路尚未签收。R2 应优先 DG5 staging 试发与 ISSUE-002 非 mock 测，并行处理 ISSUE-001 的 UX 误导。

**目标距离判定**：达成度 1/5 项（G4 完全达成）；可交付门槛 2/5 通过（DG1、DG2、DG4 中 DG4 文档 ✅，DG1/DG2 ✅，DG3/DG5 未过）。

---

## 📚 历史轮次归档

（首轮，暂无）

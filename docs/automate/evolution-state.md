# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A5_EXECUTE** |
| status | **RUNNING** |
| request | 报表中心 M0 信任链闭环 |
| type | feature |
| goal | 标准分析可读性 + 投递/smoke 绿 + 脏数据清洗 |
| last_verified | — |
| repair_rounds | 0 |
| started_at | 2026-08-23 |

## 当前需求契约

- **request**: 报表优化 M0 信任链（用户 /dev-autopilot）
- **type**: feature
- **goal**: 标准分析多期表可滚动/有提示；截断与脏日期诚实；报表域测试全绿
- **scope_include**:
  - `fe/src/pages/admin/reports/` 标准分析对比表 UX
  - `backend/app/reports/standard/theme_aggregate.py` 日期清洗
  - 报表相关 smoke/pytest 修漂移
- **scope_exclude**:
  - M1 看板查询参数/IM/模板向导
  - M2 交叉表/库内聚合/调度队列
  - git commit（除非用户要求）
- **acceptance**:
  - `pytest tests/test_*report*` / standard schedule 相关绿
  - `pnpm exec vitest run src/pages/admin/reports` 绿
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk

## 假设与决策

- 多期并排与两期对比表采用「表头固定 + 表体滚动 + 页脚总行数」；>200 行暂不虚拟滚动（M0 够用）
- 脏日期：聚合前丢弃 `created_at` 解析失败或 epoch 哨兵日期

## 上一轮（归档）

| 字段 | 值 |
|------|----|
| request | compose 内置图官方演示 SQL |
| phase | A8_DONE |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-08-23 | 报表 M0 信任链启动 |
| 2026-08-21 | compose 内置图官方演示 SQL 绑定 |

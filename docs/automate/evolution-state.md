# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A5_EXECUTE** |
| status | **RUNNING** |
| request | 报表 F-D 交叉表 MVP |
| type | feature |
| goal | 模板单维行×列交叉表 + RenderSpec 导出 |
| last_verified | — |
| repair_rounds | 0 |
| started_at | 2026-08-24 |

## 当前需求契约

- **request**: F-D 交叉表 MVP（用户 grill-me: Q1A Q2C Q3A）
- **type**: feature
- **goal**: 文档模板新增 `crosstab` 块；扩展指标长表透视后 PDF/Excel 可导出
- **scope_include**:
  - `backend/app/reports/engine/crosstab*.py`
  - `backend/app/reports/templates/`
  - `backend/app/reports/render/`
  - `fe/src/pages/admin/reports/components/TemplateBlockEditor.tsx`
  - 相关 pytest + vitest
- **scope_exclude**:
  - 套打分页 PDF、目录另存为
  - 多指标/多层列头/小计
  - git commit（除非用户要求）
- **acceptance**:
  - `pytest tests/test_report_crosstab.py tests/test_report_crosstab_template.py` 绿
  - `pnpm exec vitest run src/pages/admin/reports` 绿
  - plan-verify 对照 `docs/automate/plans/2026-08-24-report-fd-crosstab-mvp.md`
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk

## 假设与决策

- F-D 三项中本轮仅做**交叉表 MVP**（plan.md 推荐顺序第一项）
- 透视在引擎内存完成；字段名由块配置 `rowField` / `colField` / `valueField`
- 默认聚合 `sum`；`count`/`max`/`min` 同期支持

## 上一轮（归档）

| 字段 | 值 |
|------|----|
| request | 报表中心 M0 信任链闭环 |
| phase | A8_CLOSE · DONE |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-08-24 | F-D 交叉表 MVP 启动 |
| 2026-08-23 | M0 信任链闭环完成 |

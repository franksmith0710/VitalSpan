# ai-viz — 外部 AI 可视化创作域

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/ai_viz/` |
| PRD | [F17-AIVIZ](../automate/prd/F17-AIVIZ.md) |
| 里程碑 | 试点 |
| 状态 | **部分**（M1） |

## 职责

- 沙箱自定义可视化 artifact 存储与校验（HTML bundle）
- 对外规范包索引：`docs/api/vs-ai-spec/`
- 与看板 `customViz` widget 类型衔接（不进 49 chartTypes catalog）

## 边界

| In | Out |
|----|-----|
| `POST/GET /api/v1/ai-viz/artifacts` | 内置 chart plugin 注册 |
| bundle 安全扫描（禁外链脚本） | AI 生成 SQL |
| `customViz` layout 契约 | 组件库 customViz 入库（M2） |
| 可选 D3 / 渲染器创作指南（`guides/`、`theme-tokens.json`） | 强制 customViz 使用 D3 |

## 依赖

- 上游：`app/dashboard/schemas`（LayoutWidget）
- 鉴权：`dashboard:edit` / `dashboard:read`

## 关联 API

见 [api/README.md](../api/README.md) § AI 可视化。

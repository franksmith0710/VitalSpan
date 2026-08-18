# ai-viz — 外部 AI 可视化创作域

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/ai_viz/` |
| PRD | [F17-AIVIZ](../automate/prd/F17-AIVIZ.md) |
| 里程碑 | 试点 |
| 状态 | **部分**（库源码 + 唯一 Base 宿主 + Payload v1） |

## 职责

- 自定义可视化源码存储与校验（HTML bundle 落库）
- 对外规范包索引：`docs/api/vs-ai-spec/`
- 与看板 `customViz` widget 衔接：**一个** Base（`CustomVizWidget`）按 `artifactId` 异步加载 entry HTML（不进 49 chartTypes catalog）
- 运行时 Payload v1：`protocolVersion` + `bindingStatus` + execute 结果，经 `vs-cv-payload-update` 推送给 bundle

## 边界

| In | Out |
|----|-----|
| `POST/PUT/GET /api/v1/ai-viz/artifacts` | 内置 chart plugin 注册 |
| bundle 扫描（禁外链脚本、体积上限） | AI 生成 SQL |
| `customViz` layout 契约 | 一组件一 tsx/py 发版 |
| Payload v1 与 `vs-cv-payload-update` 契约 | iframe/沙箱隔离（本产品线不做） |
| 可选 D3 / 渲染器创作指南（`guides/`、`theme-tokens.json`） | 强制 customViz 使用 D3；动态注册 chartType |

## 依赖

- 上游：`app/dashboard/schemas`（LayoutWidget）
- 鉴权：`dashboard:edit` / `dashboard:read`

## 关联 API

见 [api/README.md](../api/README.md) § AI 可视化。

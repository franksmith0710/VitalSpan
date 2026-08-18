# F17-AIVIZ AI 可视化创作（VS-AI-SPEC）

> 模块：试点 · 混合方案 C  
> 状态：**部分**（规范 + 库源码 customViz + Base 主页面挂载 + manual 数据占位）

## 范围

| In | Out |
|----|-----|
| 对外 `docs/api/vs-ai-spec/` 规范包 | AI 自动生成 SQL / 智能问数 |
| 内置 chartType + `deStyle` 配置（L1/L2） | 动态注册第 50+ chartType 进 plugin catalog |
| 库中 HTML 源码 → 一个 Base 异步加载（L3） | 仓库为每个组件增加 tsx/py |
| 可选 D3 创作指南 + `theme-tokens.json`（不强制渲染器） | 强制 customViz 使用平台 D3 引擎 |
| `layoutJson` v2 混排 chart + customViz | `layout/orchestrate` 规则引擎（M2） |
| `dataBinding.status=manual` 占位保存 | 查询桥（M1：合成 table execute + payload 注入） |
| 同一 artifactId 覆盖更新 | 动态注册第 50+ chartType 进 plugin catalog |
| Payload v1（`bindingStatus` + `vs-cv-payload-update`） | iframe/沙箱隔离（本产品线不做） |

## 验收标准

- [x] AIVIZ-001：`docs/api/vs-ai-spec/` 含 README、PROTOCOL、schemas、examples
- [x] AIVIZ-002：`POST /api/v1/ai-viz/artifacts` 注册源码；`GET .../entry` 返回 HTML
- [x] AIVIZ-003：`layoutJson` 支持 `type: customViz` + `customVizConfig.artifactId`
- [x] AIVIZ-004：`POST /api/v1/charts/validate` 接受 `nativeBody.dataBinding.status=manual` 且无数据源
- [x] AIVIZ-005：FE `CustomVizWidget` 作为唯一 Base，将 entry HTML 挂进主页面宿主（与看板同页，注入 `--dashboard-*`）
- [x] AIVIZ-008：可选 D3 规范 + `theme-tokens.json` + D3/vanilla 示例；`rendererHint` 仅元数据
- [x] AIVIZ-009：`PUT /api/v1/ai-viz/artifacts/{id}` 覆盖同一组件源码，引用方刷新即新
- [x] AIVIZ-006：组件库入库 customViz（M2）
- [x] AIVIZ-007：平台向宿主喂 query 结果（后续）
- [x] AIVIZ-010：Payload v1（`protocolVersion` + `bindingStatus`）；Base 始终注入；bundle 仅监听 `vs-cv-payload-update`

## 代码锚点

- 规范：`docs/api/vs-ai-spec/`
- 后端：`backend/app/ai_viz/` · `backend/app/api/v1/ai_viz.py`
- 布局：`backend/app/dashboard/schemas.py` · `fe/src/components/dashboard/CustomVizWidget.tsx` · `customVizHost.tsx`
- 校验：`backend/app/schemas/chart_view.py` · `scripts/export-vs-ai-spec.py`

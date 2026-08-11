# F17-AIVIZ AI 可视化创作（VS-AI-SPEC）

> 模块：试点 · 混合方案 C  
> 状态：**部分**（M1 规范 + customViz 沙箱 + manual 数据占位）

## 范围

| In | Out |
|----|-----|
| 对外 `docs/api/vs-ai-spec/` 规范包 | AI 自动生成 SQL / 智能问数 |
| 内置 chartType + `deStyle` 配置（L1/L2） | 动态注册第 50+ chartType 进 plugin catalog |
| 沙箱 HTML bundle → `customViz` widget（L3） | PDF 导出 sandbox 像素保真 |
| `layoutJson` v2 混排 chart + customViz | `layout/orchestrate` 规则引擎（M2） |
| `dataBinding.status=manual` 占位保存 | postMessage 数据桥（M2） |

## 验收标准

- [x] AIVIZ-001：`docs/api/vs-ai-spec/` 含 README、PROTOCOL、schemas、examples
- [x] AIVIZ-002：`POST /api/v1/ai-viz/artifacts` 注册 bundle；`GET .../entry` 沙箱 HTML
- [x] AIVIZ-003：`layoutJson` 支持 `type: customViz` + `customVizConfig.artifactId`
- [x] AIVIZ-004：`POST /api/v1/charts/validate` 接受 `nativeBody.dataBinding.status=manual` 且无数据源
- [x] AIVIZ-005：FE `CustomVizWidget` iframe `sandbox=allow-scripts`（无 same-origin）
- [ ] AIVIZ-006：组件库入库 customViz（M2）
- [ ] AIVIZ-007：postMessage 查询桥（M2）

## 代码锚点

- 规范：`docs/api/vs-ai-spec/`
- 后端：`backend/app/ai_viz/` · `backend/app/api/v1/ai_viz.py`
- 布局：`backend/app/dashboard/schemas.py` · `fe/src/components/dashboard/CustomVizWidget.tsx`
- 校验：`backend/app/schemas/chart_view.py` · `scripts/export-vs-ai-spec.py`

# Root-First 简报：背景图需调不透明度才显示

**日期**：2026-07-30 · **模式**：Thrash / Bug · **审批**：用户「帮我修复」

## 成功标准

- 选本地/链接底图后，不透明度保持默认 100% 即能在画布组件内看到背景
- 拖动不透明度仅改变透明度，不应成为「首次显示」的必要操作

## 失败迭代复盘

| # | 尝试 | 失败原因 | 教训 |
|---|------|----------|------|
| 1 | 底图路由到 content 层 + URL 引号 | 仍依赖调 opacity 才可见 | 要同时修 shell 透明与 mode 判定 |
| 2 | 仅 shell 透明 | inner 层未纳入判定 | merge 须看 innerBackgroundLayer |

## 根源结论（L1）

1. **`mergeShapeInnerPresentation`**：底图在 `innerBackgroundLayer` 时，仅检查 `outer.backgroundLayer`，shell 仍填 `--dashboard-widget-surface`  opaque，content 区观感为「无底图」。
2. **`buildWidgetBackgroundPresentation` mode 默认**：`backgroundMode ?? (framePresetId ? "frame" : "image")` 在模板带 `framePresetId` 时即使用户已选图也走 frame，**不生成** `imageLayer`；调 opacity 时用户往往已切到图片 tab 写入 `backgroundMode:"image"`，造成「只有调 opacity 才显示」的错觉。

## 方案（P0）

- mode 默认：有 `backgroundImage` 则优先 `image`
- merge：inner/outer 底图图层均触发 shell/content 透明
- 选图时清除 `framePresetId`
- `resolveChartContentShellStyle` 按配置判定，不单依赖 outer 图层已存在
- `needsWidgetBackgroundLayer`：有 `backgroundImage` 即需要图层

## 验证

- `chartDeStyle.test.ts` / `widgetStylePresentation.test.ts` 增补用例
- vitest 通过

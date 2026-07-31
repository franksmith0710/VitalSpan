# 政企风模板素材包 `gov-enterprise-v1`

> 由 `npm run generate:gov-assets` 自动生成，请勿手改 SVG（可改脚本后重新生成）。

## 统计

| 类别 | 数量 | 尺寸 | 用途 |
|------|------|------|------|
| canvas-dark | 54 | 1920×1080 | 数据大屏整体背景 |
| canvas-light | 49 | 1920×1080 | 看板/报表浅色背景 |
| component-panel | 24 | 800×480 | 组件卡片底图（可拉伸） |
| title-strip | 15 | 720×64 | 标题装饰条 |
| **合计** | **142** | | |

## 视觉特性（v3）

- 政务模板默认 **clean-header**：浅灰底 + 顶栏细线，无图标/纹理
- 浅色 **pattern**：clean-header / header-band / card-float / watermark / corner-fold / dot-matrix / ribbon
- 深色 canvas 仍保留供选用，内置模板已切换为浅色

## 命名规则

- `canvas-dark-{palette}-{pattern}.svg`
- `canvas-light-{palette}-{pattern}.svg`
- `panel-{style}-{color}.svg`
- `title-{style}-{color}.svg`

## 引用方式

```python
# presets_gov_screens.py
bg_image="/template-assets/packs/gov-enterprise-v1/backgrounds/dark/canvas-dark-cyan-command.svg"
```

```typescript
canvasBackgroundImage: "/template-assets/packs/gov-enterprise-v1/backgrounds/dark/canvas-dark-indigo-hud-scan.svg"
```

## 重新生成

```bash
cd fe && npm run generate:gov-assets
```

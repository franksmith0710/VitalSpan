# VitalSpan 产品白皮书

> 生成时间：2026-07-14 · 主题：**theme07**（冷白调研风）

## 产物状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `_research.md` | ✅ | 扫仓事实卡 |
| `outline.json` | ✅ | 36 页大纲 + sourceRefs |
| `slides.md` | ✅ | 审阅用全文案 |
| `diagrams/` | ✅ | Mermaid 流程/架构源 |
| `goal.json` | ✅ | dashi 渲染输入（已校验） |
| `ppt/index.html` | ✅ | **dashi 正式成品**（36 页） |
| `export/vitalspan-product-whitepaper.pdf` | ✅ | PDF 导出 |
| `deck/index.html` | ✅ | 早期审阅预览稿（可忽略） |

## 规格

- **页数**：36
- **主题**：theme07 冷白调研风
- **场景 A**：多源接入 → 仪表板消费
- **场景 B**：查询服务治理 → 总线发布

## 预览

1. 打开 `ppt/index.html`（离线翻页）
2. 或在本机 dashi 预览服务中打开（若已启动 `preview:start`）

## 推断项

- M-DEPTH companion 深度体验项仍在打磨
- 部分治理/元数据页面为 L1 占位态

## 重生成

```bash
node docs/material/vitalspan-product-whitepaper/rebuild-goal.mjs
npm --prefix .agents/skills/dashiai-ppt/project run props:safe -- --goal docs/material/vitalspan-product-whitepaper/goal.json --write
npm --prefix .agents/skills/dashiai-ppt/project run render:goal -- docs/material/vitalspan-product-whitepaper/goal.json docs/material/vitalspan-product-whitepaper/ppt/index.html
```

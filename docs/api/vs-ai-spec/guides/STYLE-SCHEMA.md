# Custom Viz 样式声明（styleSchema）

> AI 可为每个组件**自由声明**平台尚未出现过的样式项；平台按 schema 自动生成配置栏，无需新增 tsx。

## 原则

1. **键名 camelCase**：如 `accentColor`、`showValue`；运行时映射为 CSS 变量 `--vs-style-accent-color`
2. **必须成对**：`styleSchema.properties` 每个键在 `defaultStyle` 里有默认值
3. **bundle 消费**：HTML 内读 `getComputedStyle(host).getPropertyValue('--vs-style-…')` 或 `.vs-cv-payload` 的 `style` 对象
4. **与内置 chart 无关**：不必复用 `deStyle` 字段名；全新设计只要 schema + bundle 一致即可

## 支持的 property 类型

| 声明 | 配置栏控件 | 示例 |
|------|-----------|------|
| `{ "type": "string", "format": "color", "title": "强调色" }` | 色块取色器 | `"accentColor": "#2563eb"` |
| `{ "type": "number", "minimum": 0, "maximum": 48, "title": "条高度" }` | DE 滑块 | `"barHeight": 20` |
| `{ "type": "number", "format": "opacity", "minimum": 0, "maximum": 100, "title": "不透明度" }` | 滑块（%） | `"fillOpacity": 80` |
| `{ "type": "boolean", "title": "显示数值" }` | 开关 | `"showValue": true` |
| `{ "type": "string", "enum": ["a","b"], "enumNames": ["横向","纵向"], "title": "排列" }` | 下拉 | `"layoutMode": "horizontal"` |
| `{ "type": "string", "title": "前缀文案" }` | 文本输入 | `"valuePrefix": "¥"` |

可选扩展：

- `"step": 0.5` — 数字步进
- `"description": "…"` — 字段下方说明（勿写 PRD 编号）
- `"x-section": "条形外观"` — 单字段归属分组（可被 `x-styleSections` 覆盖）

## 分组（多区块折叠）

```json
"styleSchema": {
  "type": "object",
  "x-styleSections": [
    { "title": "条形外观", "properties": ["accentColor", "barHeight", "cornerRadius"] },
    { "title": "标签", "properties": ["showValue", "labelColor"] }
  ],
  "properties": { ... }
}
```

未列入分组的键归入「其他」。

## AI 工作流

1. 根据需求列出组件需要哪些**可调视觉参数**（可以是平台从未有过的）
2. 写入 `styleSchema.properties` + `defaultStyle`
3. bundle 内实现对这些键的读取与渲染
4. `POST /api/v1/ai-viz/artifacts` 上传

## 参考样例

- [examples/custom-viz-bundle.json](../examples/custom-viz-bundle.json) — 含分组、开关、下拉、圆角等扩展项

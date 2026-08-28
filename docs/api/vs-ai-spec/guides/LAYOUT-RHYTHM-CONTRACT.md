# Layout Rhythm Contract（LRC）— wf3 布局契约

> **铁律** → [IRON-RULES.md](../IRON-RULES.md) · **layoutJson** → [DASHBOARD-LAYOUT.md](./DASHBOARD-LAYOUT.md)  
> **legacy 成品模板** → [COMPOSE-TEMPLATES-DE.md](./COMPOSE-TEMPLATES-DE.md)（参考金样，非 wf3 默认）

## 定位

| 概念 | 是什么 | 不是什么 |
|------|--------|----------|
| **Rhythm（节律契约）** | 分区语法：bands、可选 KPI 带、比例、壳层 | 带 8 固定槽 + defaultChartType 的成品 JSON |
| **Blocks（本屏块清单）** | 用户本次要什么：cv / chart、占哪个 band | 选 `de-sales-command` 抄一整屏 |
| **Compose** | `rhythm` + `blocks` → **生成** layout | `template=` → **复制** slots |

## 工具

```
vitalspan_list_layout_rhythms
vitalspan_compose_dashboard
  surface_kind=data-screen
  rhythm=rhythm-cv-stage
  blocks=[{"band":"primary","kind":"customViz","artifactId":"<uuid>","title":"趋势"},...]
  name=综合运营驾驶舱
  data_binding=manual
```

## 首批 rhythm（通用，非行业）

| id | 用途 |
|----|------|
| `rhythm-cv-stage` | **默认 data-screen** · 无 KPI 带 · 大 cv 舞台 |
| `rhythm-hero-stack` | 可选 metrics（**0～4 KPI**）+ 主/辅/底 |
| `rhythm-split-focus` | 侧栏栈 + 中央主图 |
| `rhythm-balanced-grid` | 2×2 四象限，无 KPI 行 |
| `rhythm-minimal` | **默认 dashboard** · 1440 极简 |

## blocks 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `band` | 是 | rhythm 内 band id |
| `kind` | 是 | `chart` \| `customViz` |
| `chartType` | chart 时 | 内置图类型 |
| `artifactId` | customViz 时 | 组件库 uuid |
| `title` | 否 | widget 标题 |

## Agent SOP（wf3 默认）

1. 用户故事 → 声明 **blocks**（不写行业 template）
2. `list_layout_rhythms` → 选 rhythm（2 个 cv → `rhythm-cv-stage`）
3. `list_artifacts` 当 blocks 含 customViz
4. `compose_dashboard` rhythm + blocks + `manual`
5. `completion_gate workflow=3`

**禁止** wf3 默认 `template=de-classic-cockpit`（legacy，会复制 KPI×4）。

## legacy template=

仍可用但 stdout 含 `[warn] LEGACY_TEMPLATE`。仅兼容旧脚本。

返回：[COMPOSE-STYLE-WORKFLOW.md](./COMPOSE-STYLE-WORKFLOW.md)

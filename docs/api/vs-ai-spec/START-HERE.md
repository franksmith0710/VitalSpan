# START HERE — 外部 AI 必读总入口

> **先读 [PACK-IDENTITY.md](./PACK-IDENTITY.md)**：本目录是 **集成规范包**，不是组件工程项目。  
> **三条工作流必须分开** → [guides/THREE-WORKFLOWS.md](./guides/THREE-WORKFLOWS.md)

## 0. 三条线（不要混）

| 线 | 任务 | 落到平台哪里 | 完成判据 |
|----|------|-------------|----------|
| **① 内置图** | 柱/线/饼/表/地图 `chartConfig` | 写进大屏 layout，**不进组件库** | `POST /charts/validate` 200 |
| **② 组件库** | **新组件** html/d3 开发与入库 | **`ai_viz_artifacts` 组件库** | **`artifactId=<uuid>`** |
| **③ 大屏** | 编排 layout，**复用库中已有 + ② 新上传** | `dashboards.layout_json` | `editor-save` 200 + `dashboardId` |

```
开发新组件 (②)  ──artifactId──►  大屏编排 (③)  可引用多个已有/新建 artifactId
内置图 (①)      ──chartConfig──►  大屏编排 (③)  与组件库无关
```

- **② 只做组件**：validate → upload → 汇报 `artifactId`，**不要求**同任务内拼大屏。  
- **③ 只做编排**：layout 里填 `customVizConfig.artifactId`（库中已有或 ② 刚传的），**不写**组件 HTML。

## 1. 一键命令

### ② 组件库（d3/html 新组件）

```bat
python tools\validate-ai-viz-bundle.py --file examples\你的组件.json
python tools\upload-ai-viz-artifact.py --file examples\你的组件.json
```

### ① 内置图

```bat
python tools\validate-chart-config.py --file examples\bar-manual-deStyle.json
```

### ③ 大屏

```bat
python tools\upload-dashboard-layout.py --dashboard-id <大屏uuid> --file examples\e2e-mixed-screen.json
```

## 2. Runbook 索引

| 线 | 文档 |
|----|------|
| 总览 | [guides/THREE-WORKFLOWS.md](./guides/THREE-WORKFLOWS.md) |
| ② 组件库 | [EXTERNAL-AUTHOR.md](./EXTERNAL-AUTHOR.md) · [00-REQUIREMENTS.md](./00-REQUIREMENTS.md) |
| ① 内置图 | [guides/L1-L2-CHART-CONFIG.md](./guides/L1-L2-CHART-CONFIG.md) |
| ③ 大屏 | [guides/DASHBOARD-LAYOUT.md](./guides/DASHBOARD-LAYOUT.md) |
| DeepTalk 提示词 | [DEEPTALK-AGENT-PROMPT.md](./DEEPTALK-AGENT-PROMPT.md) |

## 3. 环境

| 项 | 值 |
|----|-----|
| API | `http://127.0.0.1:8000/api/v1` |
| 健康检查 | `GET http://127.0.0.1:8000/health` |
| 组件库列表 | `GET /api/v1/ai-viz/artifacts` |
| 桌面包 validate | `VITALSPAN_ROOT=C:\...\VitalSpan` |

## 4. 禁止假完成

写本地 JSON（含 `output/`）≠ ② 入库 ≠ ③ 保存大屏。必须见上表 HTTP 判据。

## 5. 刷新本包

```powershell
.\scripts\sync-vs-ai-spec-pack.ps1
.\scripts\pack-vs-ai-spec-deeptalk-test.ps1
```

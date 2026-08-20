# 外部作者 Runbook（DeepTalk / 第三方 AI）

> **你只负责写组件；入库与看板挂载由本脚本链路完成。**  
> 写文件到桌面或 `examples/` **不等于**对接成功。

## 三步（必须按顺序）

| 步 | 做什么 | 成功标志 |
|----|--------|----------|
| 1 | 读 [00-REQUIREMENTS.md](./00-REQUIREMENTS.md) + [guides/PLATFORM-SLA.md](./guides/PLATFORM-SLA.md) | 知道 `runtime: d3` 必须 `host.vsCv.mount(` |
| 2 | `python tools/validate-ai-viz-bundle.py --file examples/<你的>.json` | 输出 `preflight ok`（warn 可入库，error 会 422） |
| 3 | `python tools/upload-ai-viz-artifact.py --file examples/<你的>.json` | 打印 `artifactId=<uuid>` |

把 `artifactId` 交给 VitalSpan 方，或自行在大屏 widget `customVizConfig.artifactId` 填入。

## 常见失败（不是平台坏了）

| 现象 | 原因 | 处理 |
|------|------|------|
| DeepTalk 说「已传过去」但图表盘没有 | 只 `write_file` 到本机，**未 POST** | 跑第 3 步 upload |
| `422 AIVIZ_MOUNT_REQUIRED` | d3 用了 `onPayload` 没 `vsCv.mount` | 改入口脚本后重跑 2→3 |
| `preflight FAILED: AIVIZ_PREFLIGHT_NO_BACKEND` | 规范包在桌面，找不到 VitalSpan 仓 | 设 `VITALSPAN_ROOT=C:\...\VitalSpan` 或在仓内跑 |
| 浏览器从 DeepTalk 域名 fetch 失败 | CORS | 用本机 `upload-ai-viz-artifact.py`，不要网页跨域 POST |
| 组件在盘里但大屏空白 | 未绑 Dataset / 未填 artifactId | 编辑器绑字段 + 检查 uuid |

## 环境变量

| 变量 | 默认 |
|------|------|
| `VITALSPAN_API` | `http://127.0.0.1:8000/api/v1` |
| `VITALSPAN_USERNAME` | `admin` |
| `VITALSPAN_DEV_ADMIN_PASSWORD` | `changeme` |
| `VITALSPAN_ROOT` | 自动向上查找含 `backend/app/ai_viz` 的目录 |

## VitalSpan 方：刷新外部测试包

在 VitalSpan 仓库根目录：

```powershell
.\scripts\sync-vs-ai-spec-pack.ps1
```

会把 `docs/api/vs-ai-spec/` 同步到桌面 `vs-ai-spec-deeptalk-test`（可 `-Destination` 覆盖）。

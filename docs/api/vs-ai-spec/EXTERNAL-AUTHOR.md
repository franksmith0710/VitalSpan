# 外部作者 Runbook（DeepTalk / 第三方 AI）

> **先读 [00-REQUIREMENTS.md §0](./00-REQUIREMENTS.md#0-对外暴露什么--上传到哪里)**  
> **完成 = 拿到 `artifactId`。写本地 JSON ≠ 上传。**

## 0. 一句话（禁止误解）

| 错 | 对 |
|----|-----|
| 「已保存到 `vs-ai-spec-deeptalk-test/output/xxx.json`」 | 「`ok artifactId=550e8400-...`」 |
| 「组件在工作区，可直接使用」 | 「已 POST 到 `http://127.0.0.1:8000/api/v1/ai-viz/artifacts`」 |
| DeepTalk 只跑了 `write_file` | 必须再跑 **`upload-ai-viz-artifact.py`** 或等价 HTTP POST |

**规范包目录**（如 `C:\Users\...\vs-ai-spec-deeptalk-test`）是**读文档、写草稿、跑脚本**用的，**不是** VitalSpan 入库服务器。  
**禁止**自建 `output/` 当交付目录；草稿可放 `examples/你的组件.json` 或任意路径，但**必须**用 upload 脚本 POST 出去。

## 三步（必须按顺序）

| 步 | 做什么 | 成功标志 |
|----|--------|----------|
| 0 | 确认 VitalSpan 后端已启动：`GET http://127.0.0.1:8000/health` → `ok` | 健康检查通过 |
| 1 | 读 [00-REQUIREMENTS.md](./00-REQUIREMENTS.md) + [guides/PLATFORM-SLA.md](./guides/PLATFORM-SLA.md) | 知道 `runtime: d3` 必须 `host.vsCv.mount(` |
| 2 | `python tools/validate-ai-viz-bundle.py --file examples/<你的>.json` | 输出 `preflight ok`（warn 可入库，error 会 422） |
| 3 | `python tools/upload-ai-viz-artifact.py --file examples/<你的>.json` | 打印 **`ok artifactId=<uuid>`** |

把 **`artifactId`** 交给 VitalSpan 方，或自行在大屏 widget `customVizConfig.artifactId` 填入。  
**向用户汇报时必须附带该 uuid**；不得只说「文件路径」。

## 禁止的完成说法（说了 = 未完成）

- 「已上传到 `vs-ai-spec-deeptalk-test/...`」
- 「已保存到 `output/trend-chart-dynamic.json`」
- 「共 1 步，写入工作区完成」
- 「可在 VS Code AI 扩展中使用」
- 「已传过去」但**没有** `artifactId`

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
| `VITALSPAN_ROOT` | 桌面规范包**必填**（指向 VitalSpan 克隆根目录）；在 VitalSpan 仓内跑可自动发现 |

## VitalSpan 方：刷新外部测试包

在 VitalSpan 仓库根目录：

```powershell
.\scripts\sync-vs-ai-spec-pack.ps1
```

会把 `docs/api/vs-ai-spec/` 同步到桌面 `vs-ai-spec-deeptalk-test`（可 `-Destination` 覆盖）。  
**不会删除**你本地 `examples/` 里额外写的组件 JSON（非镜像删除）。

VitalSpan 方重打 zip 分发：

```powershell
.\scripts\pack-vs-ai-spec-deeptalk-test.ps1
```

产出 `docs/api/vs-ai-spec-deeptalk-test.zip`。

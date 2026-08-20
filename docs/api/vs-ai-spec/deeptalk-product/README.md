# DeepTalk 产品级对接 VitalSpan

> VitalSpan 仓内交付物：DeepTalk 产品仓 **embed / sync** 用。  
> 铁律：[../IRON-RULES.md](../IRON-RULES.md) · 桌面包 MVP：[../START-HERE.md](../START-HERE.md)

## 目录结构（DeepTalk 仓目标）

DeepTalk 产品仓应挂载：

```
deeptalk/
  integrations/vitalspan/
    config.yaml              # 从 config.yaml.example 复制，勿提交密钥
    README.md                # 可 symlink 本文件
    vs-ai-spec/              # 与本包上级目录同步（robocopy / submodule）
    executor/                # 从 deeptalk-product/executor 复制或 submodule
```

`vs-ai-spec/` 内容与 VitalSpan `docs/api/vs-ai-spec/` 一致（examples、tools、IRON-RULES 等）。

## 安装到 DeepTalk 仓

在 VitalSpan 仓根目录：

```powershell
# 默认目标：..\deeptalk\integrations\vitalspan（可通过 -DeepTalkRoot 指定）
.\scripts\sync-vs-ai-spec-to-deeptalk-repo.ps1 -DeepTalkRoot C:\path\to\deeptalk
```

或仅安装 executor + 配置模板：

```powershell
.\docs\api\vs-ai-spec\deeptalk-product\install-to-deeptalk.ps1 -DeepTalkRoot C:\path\to\deeptalk
```

## DeepTalk 服务端集成

1. **系统提示词**：内置 [AGENT-SYSTEM-PROMPT.md](./AGENT-SYSTEM-PROMPT.md)（含 `integrations/vitalspan/vs-ai-spec` 路径与禁止 `output/` 终点）
2. **工具注册**：见 [agent-tools.schema.json](./agent-tools.schema.json)；DeepTalk Agent 调用 `python executor/cli.py <tool> ...`
3. **Publish 执行器**：`executor/publish_executor.py` — 写 `examples/` → preflight → publish → 解析 `artifactId`
4. **完成 Gate**：`executor/completion_gate.py` — 无 `artifactId`/`dashboardId` 禁止标记任务完成

### 一键工具 CLI（DeepTalk 服务端 subprocess）

```bash
cd integrations/vitalspan
python executor/cli.py vitalspan_health_check
python executor/cli.py vitalspan_publish_artifact --file examples/my-widget.json
python executor/cli.py vitalspan_list_artifacts
python executor/cli.py vitalspan_delete_artifact --artifact-id <uuid>
python executor/cli.py vitalspan_upload_dashboard --dashboard-id <uuid> --file examples/e2e-mixed-screen.json
python executor/cli.py vitalspan_completion_gate --workflow 2 --agent-summary "ok artifactId=..."
```

环境变量（或由 `config.yaml` 注入）：

| 变量 | 说明 |
|------|------|
| `VITALSPAN_API` | 默认 `http://127.0.0.1:8000/api/v1` |
| `VITALSPAN_ROOT` | VitalSpan 仓根（preflight） |
| `VITALSPAN_USERNAME` | 默认 `admin` |
| `VITALSPAN_DEV_ADMIN_PASSWORD` | 开发密码 |

## 版本同步

| 方式 | 命令 |
|------|------|
| 桌面 MVP | `.\scripts\sync-vs-ai-spec-pack.ps1` |
| DeepTalk 产品仓 | `.\scripts\sync-vs-ai-spec-to-deeptalk-repo.ps1` |
| 离线 zip | `.\scripts\pack-vs-ai-spec-deeptalk-test.ps1` |

同步排除 `examples/_work`；**不**镜像删除 DeepTalk 本地 `examples/` 用户产物。

## 验收

见 [E2E-CHECKLIST.md](./E2E-CHECKLIST.md)。

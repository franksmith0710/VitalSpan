# `.dev` 落盘检查清单

Schema：[dev-config.md](../../browser-reviewer/references/dev-config.md)。

## 1. 目录

```
.dev/
├── config.yaml
├── secrets.env
├── baselines/      # 可选
├── playbooks/      # 可选
└── walkthrough/    # 可选，产物
```

## 2. 写入时同步规则

1. 写完 / 改完 `environments` 与 `active_env` 后，**同步顶栏**：
   - `app.name` ← `project.name`
   - `app.base_url` ← `environments[active].browser_url`
   - `app.start` / `start_cwd` ← 仅当 active 为 local 且有值
   - `external.api_base` ← `environments[active].api_url`
   - `auth` ← `environments[active].auth`（若有）
   - `walkthrough.allow_*` ← 与 active 环境对齐（取更严：任一 false 则 false）
2. `prod` / `kind: production`：`walkthrough.enabled=false`；无 `password` / 无生产 `password_env`（除非用户明示 allow_prod 且书面确认——仍强烈不推荐）
3. `walkthrough.allow_prod` 默认 `false`

## 3. 最小示例（local + 地图骨架）

```yaml
project:
  name: my-console

active_env: local

environments:
  local:
    kind: local
    label: 本机开发
    browser_url: http://127.0.0.1:5173
    api_url: http://127.0.0.1:8080
    start: npm run dev
    start_cwd: fe
    ready_timeout_sec: 120
    deploy: { location: "", method: "", region: "", link: "" }
    logs: { url: "", query_hint: "" }
    network: { vpn_or_bastion: none, note: "", kubectl_context: "" }
    connections: []
    auth:
      strategy: form
      login_path: /login
      username: admin
      password_env: DEV_ADMIN_PASSWORD
    walkthrough:
      enabled: true
      allow_writes: false
      allow_destructive: false

  staging:
    kind: staging
    label: 远端测试
    browser_url: https://staging.example.com   # 待确认可先占位
    api_url: ""
    deploy: { location: "", method: "", region: "", link: "" }
    logs: { url: "", query_hint: "" }
    network: { vpn_or_bastion: required, note: "", kubectl_context: "" }
    connections: []
    auth:
      strategy: form
      login_path: /login
      username: admin
      password_env: STAGING_ADMIN_PASSWORD
    walkthrough:
      enabled: true
      allow_writes: false
      allow_destructive: false

  prod:
    kind: production
    label: 生产
    browser_url: https://example.com
    api_url: ""
    deploy: { location: "", method: "", region: "", link: "" }
    logs: { url: "", query_hint: "" }
    network: { vpn_or_bastion: required, note: "", kubectl_context: "" }
    connections: []
    auth:
      strategy: form
      login_path: /login
      username: ""
    walkthrough:
      enabled: false
      allow_writes: false
      allow_destructive: false

app:
  name: my-console
  base_url: http://127.0.0.1:5173
  start: npm run dev
  start_cwd: fe
  ready_timeout_sec: 120

auth:
  strategy: form
  login_path: /login
  username: admin
  password_env: DEV_ADMIN_PASSWORD
  success:
    url_includes: /

external:
  api_base: http://127.0.0.1:8080

walkthrough:
  allow_writes: false
  allow_destructive: false
  allow_prod: false
  artifact_dir: .dev/walkthrough
  baseline_dir: .dev/baselines
  pixel:
    mode: perceptual
    threshold: 0.01

viewport:
  desktop: { width: 1440, height: 900 }
```

占位 URL 在预览中标 `（待确认）`；用户跳过的环境可只留空字符串，不要删键（便于下次补地图）。

## 4. `secrets.env`

```bash
DEV_ADMIN_PASSWORD=...
STAGING_ADMIN_PASSWORD=...
```

禁止默认写入 `PROD_*` 密码。

## 5. `.gitignore`

推荐：

```
.dev/
```

## 6. 写入后自检

| 检查 | 通过 |
|------|------|
| active 的 browser_url 或 app.base_url 非空 | ✓ |
| 顶栏 app/auth/external 与 active 一致 | ✓ |
| 非 prod 走查：有密码来源 | ✓ |
| prod：enabled=false；无生产密码字段 | ✓ |
| allow_prod 默认 false | ✓ |
| connections 无明文密码 | ✓ |
| secrets / `.dev` 被 ignore；未被 git 跟踪含密文件 | ✓ |

## 7. 禁止

- 把生产密码、kubeconfig、云 AK/SK 写入 yaml  
- 未确认覆盖精修 `.dev`  
- commit 含密钥的 `.dev` 文件  
- 静默将 `active_env` 设为 prod

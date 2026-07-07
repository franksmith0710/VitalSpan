# 信创部署验收（NFR-007）

> 报告端点：`GET /api/v1/nfr/xinchuang/deployment-report`

## 报告字段

| 字段 | 说明 |
|------|------|
| `registeredXinchuangConnectors` | registry 中 gbase/dm/gaussdb/kingbase |
| `composeServices` | 解析仓库根 `docker-compose.yml` 服务名 |
| `dialectReadOnlySmoke` | 已注册信创方言存在性 smoke |
| `overallAcceptance` | `accepted` / `conditional` / `rejected` |
| `components` | DB/中间件/OS 组件清单 stub |

## docker-compose 对照

本地开发栈见仓库根 `docker-compose.yml`（`postgres`、`analytics-postgres`、`sample-mysql` 等）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `XINCHUANG_DEPLOY_MODE=strict` | 无信创连接器 → 422 `XINCHUANG_NON_COMPLIANT` |
| `XINCHUANG_DEPLOY_MODE=permissive` | 默认 |

## pytest

- `tests/test_mfinal_fe_gov_batch3_r247.py` — `T-NFR-R247-007-*`
- `@pytest.mark.xinchuang_smoke` — CONN-017~022 `describe_registration_path`

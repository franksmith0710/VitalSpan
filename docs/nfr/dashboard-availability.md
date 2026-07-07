# 核心看板可用性（NFR-003）

> 复合探针：`GET /api/v1/nfr/dashboard-availability/report?dashboardId=`

## 阈值

| 指标 | 阈值 | 来源 |
|------|------|------|
| SLA uptime | ≥ 99.5% | `dashboard_sla.probe_dashboard_sla` |
| 首屏 P95 | ≤ 5000ms | `dashboard_first_screen` budgetMs |

## 综合判定

- `overallStatus`: `available` | `degraded` | `unavailable`
- `withinSla && withinFirstScreenBudget` → `available`

## 环境变量

| 变量 | 说明 |
|------|------|
| `DASHBOARD_AVAILABILITY_MODE=strict` | `overallStatus != available` 时 HTTP 503 `DASHBOARD_AVAILABILITY_BREACH` |
| `DASHBOARD_AVAILABILITY_MODE=permissive` | 默认；仅返回报告 JSON |

## CI / pytest

- 主套件：`tests/test_mfinal_fe_gov_batch3_r247.py`（`T-NFR-R247-003-*`）
- 探针预算：`probe_dashboard_availability_budget_ms` ≤ 50ms

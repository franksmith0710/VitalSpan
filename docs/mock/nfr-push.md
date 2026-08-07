# NFR 推送通道 Mock

| 字段 | 值 |
|------|-----|
| 模块 | `backend/app/core/nfr/push_channels.py` |
| 关联 | `core/nfr/notifications.py` · `core/nfr/push_config.py` · `api/v1/nfr.py` |
| 域附录 | [services/nfr.md](../services/nfr.md) |

## 行为

- `dispatch_push_mock`：NFR 探针与未配置真实推送通道时的占位分发。
- 治理发布通知（`governance/publish/notifications.py`）在 SMTP/通道未就绪时可能走 mock 路径。

## 非 mock 路径

生产 SMTP 配置就绪且 `rpt_delivery_mode` 非 mock 时，报表调度投递走 `scheduler/delivery.py` 真实 SMTP（见 [reports-scheduler.md](./reports-scheduler.md)）。

## 计划

M1–M6 以探针与诚实 `unconfigured` 为主；外发通道选型见 PRD F15-NFR 分期。

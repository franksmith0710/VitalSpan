# Mock / Stub 诚实清单

> **定位**：非测试主路径上的占位、探针与假成功能力；**禁止**在 [api/README.md](../api/README.md) 或 [services/](../services/) 中写成已交付正式能力。  
> 详细域边界见各 [services](../services/) 附录；本目录仅作**集中索引**。

| 文档 | 模块 | 级别 | 说明 |
|------|------|------|------|
| [nfr-push.md](./nfr-push.md) | `core/nfr/push_channels` | probe / 未配 SMTP | 推送通道 mock 分发 |
| [reports-scheduler.md](./reports-scheduler.md) | `reports/scheduler` | probe / 显式 header | 调度执行与投递 mock |
| [query-dataset.md](./query-dataset.md) | `query/dataset` | stub plan | Dataset execute 非真实 SQL |
| [governance.md](./governance.md) | `metadata/physical` · `governance` | stub | 血缘/治理引用占位 |

**启用原则**：须显式 env、HTTP header 或管理探针；默认客户路径不得静默 mock 成功。

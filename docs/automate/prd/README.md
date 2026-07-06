# PRD 分片索引

> **16 域 · 124 项** · 来源 SRS V3.7 + 附录 E/F + FR-DATA/FR-ETL（F16）  
> Hub 索引：[`../prd.md`](../prd.md) · 执行范围：[`../plan.md`](../plan.md)（当前 **P1–P3**；M13 冻结）

| 分片 | ID 域 | 模块 | 期次 | 项数 |
|------|-------|------|------|------|
| [F01-BOOT.md](./F01-BOOT.md) | BOOT-001 ~ BOOT-006 | P0 | P0 | 6 |
| [F02-AUTH.md](./F02-AUTH.md) | AUTH-001 ~ AUTH-008 | M7-RLS | 一期 | 8 |
| [F03-DS.md](./F03-DS.md) | DS-001 ~ DS-008 | 连接层 | 一期 | 8 |
| [F04-CONN.md](./F04-CONN.md) | CONN-001 ~ CONN-022 | 连接层 | 一～四期 | 22 |
| [F05-QUERY.md](./F05-QUERY.md) | QUERY-001 ~ QUERY-009 | M3 | 一/三/四期 | 9 |
| [F06-VIZ.md](./F06-VIZ.md) | VIZ-001 ~ VIZ-008 | M4 | 一/三期 | 8 |
| [F07-DASH.md](./F07-DASH.md) | DASH-001 ~ DASH-006 | M5 | 一/二期 | 6 |
| [F08-RPT.md](./F08-RPT.md) | RPT-001 ~ RPT-007 | M6 | 二/三期 | 7 |
| [F09-VIEW.md](./F09-VIEW.md) | VIEW-001 ~ VIEW-003 | FR-VIEW | 一/二/三期 | 3 |
| [F10-GOV.md](./F10-GOV.md) | GOV-001 ~ GOV-008 | M8 | 一/四期 | 8 |
| [F11-META.md](./F11-META.md) | META-001 ~ META-006 | 语义层/实体 | 二/四期 | 6 |
| [F12-DESIGN.md](./F12-DESIGN.md) | DESIGN-001 ~ DESIGN-005 | M2 设计器 | **四期** | 5 |
| [F13-API.md](./F13-API.md) | API-001 ~ API-007 | IF | 一/三/四期 | 7 |
| [F14-CAT.md](./F14-CAT.md) | CAT-001 ~ CAT-007 | 附录 E | 一～三期 | 7 |
| [F15-NFR.md](./F15-NFR.md) | NFR-001 ~ NFR-008 | NFR | 一～四期 | 8 |
| [F16-DATA.md](./F16-DATA.md) | DATA-004 ~ DATA-005 · ETL-001 | M1B 接入 | P0+ | 6 |

**四期冻结说明**：F12 全域、F11 的 META-001~004、F05 的 QUERY-007~009、F10 的 GOV-003~008、F04 的 CONN-017~022 等 `期次：四期` 项仍在 PRD 内有效，当前仅 **plan 排期后置**（见 plan §M13 冻结）。

# views — 角色与用户视图

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/views/` |
| PRD | [F09-VIEW](../automate/prd/F09-VIEW.md) · VIEW-001 ~ VIEW-003 |
| 里程碑 | FR-VIEW |
| 状态 | **未实现** |

## 职责

- 按角色/用户配置 Portal 首页与菜单可见性
- 视图模板与默认落地页（不含预置业务场景包）
- 与 `auth` 角色绑定

## 边界

| In | Out |
|----|-----|
| 视图配置、菜单 IA 数据 | 壳层渲染（前端 `fe/`） |
| | Dashboard/报表实体（→ `dashboard` / `reports`） |

## 依赖

- `core`、`auth`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `ViewTemplateService` | 模板 CRUD | VIEW-001 | 待建 |
| `UserViewResolver` | 用户生效视图 | VIEW-002~003 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §视图（规划）。

## 实现笔记

<!-- 随 VIEW-* 落地补充 -->

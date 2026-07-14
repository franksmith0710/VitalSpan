# Examples（执行样例）

供主 agent 对齐格式；真实评审按 [report-template.md](report-template.md) 出完整报告。

## 合并去重（L1 ∩ L7）

**Lane 原始**

- L1：`[P0] FORCE_STUB 探针假成功 — internal/probe/stub.go — flag 开启返回 connected:true — 删 stub`
- L7：`[P0] 集成页常驻假数据 — fe/src/pages/Integration.tsx — 菜单已挂且列表写死 — 接 API 或撤菜单`

**合并后（一条）**

```markdown
### P0-1 · 集成探测假绿（stub + 已挂入口）

| 字段 | 内容 |
|------|------|
| 类别 | 假绿·stub / 产品表面 |
| 证据 | `internal/probe/stub.go` — FORCE_STUB 返回 connected:true；`fe/src/pages/Integration.tsx` — 菜单可进且列表写死 |
| 为何致命 | 运维/用户以为外部系统已通 |
| 建议修法 | 删 stub 接真探测；页面接 API 或撤菜单与宣称 |
| 可批量 | 是（批次 A） |
```

## 宣称判据

| 事实 | 级别 |
|------|------|
| README 写「支持 SSO」，各端无入口 | P1 |
| 仅内部 issue 规划 SSO，无 README/UI 承诺、无入口 | P2 |
| 侧栏有「SSO」、页为 Skeleton 且无请求 | P0 |

## 报告总览片段

```markdown
| 项 | 内容 |
|----|------|
| 范围 | PR·变更面（主根：`services/bff`, `fe/src/pages/ops`；上追菜单） |
| 扫描方式 | 并行 lane：L1 L2 L3 L4 L7（subagent）；L5 跳过（本 PR 无 UI 壳变更）；L6 跳过（无 IaC diff） |
| Blind spots | L3：worker 子模块未 checkout，队列默认值未核 |
| P0 / P1 / P2 | 2 / 3 / 1 |
| 建议 | 暂缓（存在 Blind spot；且有未修 P0） |
```

## Phase 1 提示词（缩略）

完整模板见 [stack-detection.md](stack-detection.md)。最小必要字段：`项目根`、`范围模式`、`Lane ID`、`Stack 摘要`、`搜法`、`排除测试`、`回传格式`。

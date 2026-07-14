# Finding Catalog（共性问题反模式）

技术栈无关。每节：**症状 → 为何致命 → 锚点（例）→ 修法**。  
具体 `rg` 模式按 [stack-detection.md](stack-detection.md) 改写后交给 subagent。表中 Go/运维平台例子仅为示意。

---

## §1 假绿 / Stub 零容忍 — 优先 P0

**政策**：非测试代码里**不允许**保留 stub/mock/假成功路径。`FORCE_STUB`、feature flag、`profile=dev`、Badge、诚实 `degraded` **一律不能**当「设计如此」放过——修法是删 stub 并接真实现，或撤入口与宣称。

| 反模式 | 为何致命 | 锚点（例） | 修法 |
|--------|----------|------------|------|
| 任意可激活 stub（含 env/flag 才开启） | 一开开关就假绿；评审以为「有门闩就安全」 | `FORCE_STUB`、`USE_MOCK`、`if stub { return ok }` | **删除** stub 分支；只留真实集成；本地用测试双或外部 sandbox，不进主路径 |
| 探测/集成 stub 返回成功态（connected/ok/healthy） | 运维以为外部系统已通 | probe 固定 true、假 health | 接真实探测；失败就失败，禁止占位成功 |
| Dry-run / stub 评估固定「命中」或假指标 | 规则/模型看似有效 | stub evaluator、mock samples | 无后端则拒绝请求；禁止固定命中 |
| 不足条件时塞 Mock 数据当正式结果 | 排障看假数据 | mock federation、fixture 当 API | empty + 引导配置；禁止当正式 payload |
| 后端/BFF stub，UI 无论有无 Badge | 「功能完成」假象 | mock provider、占位 handler | 删 stub；未就绪则撤路由/菜单 |
| 未实现却挂菜单/路由 | 点进去才挂或空白 | `NotImplemented`、501、空页 | 隐藏入口；文档勿写已交付 |

**唯一不报（非问题）**：`*_test.*` / `*.spec.*` / `__mocks__` / fixture、以及**仅** Storybook/设计系统 demo 且未被产品路由挂上的 mock。

---

## §2 硬编码 — 优先 P0/P1

| 反模式 | 级别 | 说明 | 修法 |
|--------|------|------|------|
| 生产可启动且使用仓库已知默认密钥/token，门禁缺失或未调用 | P0 | 密钥可预测 | 启动校验拒绝 dev 默认；prod 模板 CHANGE_ME |
| Live/生产路径写死内网 IP、默认 community/口令 | P1 | 打错目标或误报 | 必填配置，无危险默认 |
| KPI/图表硬编码演示数字 | P0 | 仪表假绿 | 无 API 不展示；或「示例」且默认关 |
| 默认指向 `/tmp/stub-*`、仓库 fixture、echo 成功脚本 | P1 | 空跑却绿 | 无有效资源则失败；UI 选择器 |
| 版本号写死 `*-dev` / `0.0.0` | P2 | 无法对版本；对外已发正式包仍如此可升 P1 | 构建注入版本元数据 |

**勿升 P0**：仅本地默认配置 + 有 prod 模板 + **进程门禁已接线** → 不报或 P2「勿拷贝 dev yaml」。  
**升 P0**：门禁缺失或 Validate 已写未调用（见 §6）。  
**勿报**：首次 seed 超管；测试双 / 纯 Storybook demo mock（见 SKILL「非问题」）。

---

## §3 可靠性 & 真实缺口 — 优先 P0/P1

| 反模式 | 级别 | 说明 | 修法 |
|--------|------|------|------|
| 进程内队列/memory broker、all-in-one 角色被安装文档当生产推荐 | P1–P0 | 扩不了、关停丢任务 | 生产门禁拒绝；文档改真实拓扑 |
| 清理/retention 默认 dry-run 且无告警 | P1 | 存储无限涨 | prod 关 dry-run；日志+指标 |
| 吞错（空 catch / Ignore / continue）且无指标 | P1 | 审计/出站静默丢 | metrics + 可查询失败 |
| 配置宣称某 Driver/引擎，启动未接线 | P0 | 架构承诺落空 | 接线或文档降级 |
| 无公开 liveness/readiness | P1 | 无法探活 | 与鉴权诊断分离的 `/health` 类探针 |
| 多租户/组织隔离查询漏边界条件 | P0 | 串数据 | 全路径带租户/org；补测 |
| 会话/缓存「规划中」却按多实例部署 | P1 | 状态不一致 | 限制单实例或落地共享存储 |

---

## §4 坏表单 UX（路径 / JSON / YAML）— 至少 P1

用户不应充当「配置文件编辑器」（Web / Desktop / 管理后台皆适用）。

| 反模式 | 例子 | 修法 |
|--------|------|------|
| 文本框填 **文件系统路径** | 脚本/playbook/证书路径、fixture | 资源选择器、上传、目录 API；自由路径仅高级折叠 |
| 大 Textarea / Monaco **贴 YAML/JSON** 作主配置 | 流水线、策略、IaC 片段、权限 JSON | 结构化表单或可视化；YAML 仅高级/导入导出 |
| 默认 `echo`/noop/示例配置一跑就成功 | 内置模板、fallback 配置 | 向导或真实脚手架；禁止无提示的假成功默认 |
| 仅服务端/引擎报错 | 提交后才 JSON/YAML 解析失败 | 客户端 schema + 行级错误 |

**验收**：主路径可不打开「高级 YAML/JSON」完成任务；路径字段对普通角色不可见或只读。

**无 UI 的仓**：本 lane 标跳过；若 CLI 强制手写大段 YAML 且无 `init`/向导，可记 P2「CLI UX」。

---

## §5 UI 风格不一致 — P1

对照**本仓**设计系统 / page-craft skill / 最完整的 1～2 个标杆页（框架不限：React/Vue/Svelte/原生）。

| 检查项 | 一致 | 不一致（报） |
|--------|------|--------------|
| 页头 | 统一 Header 模式（标题+说明+主操作） | 裸标题 / 操作散落 |
| 筛选与内容分层 | 工具区与主内容分层 | 控件与表糊一层 |
| 异步 | 统一 loading / empty / error | 半页空白、空态一行字、原始异常串 |
| 空态 | 说明 + 可行动 CTA | 「暂无数据」 |
| 密度与 Token | 同级页一致 | 混用无关间距/颜色体系 |
| CRUD 承载 | Dialog/抽屉/独立页有约定 | 同域无理由混用 |

输出：「标杆文件」+「待改页」，供 batch-fix 按页拆 subagent。无 UI → 跳过。

---

## §6 开发便利 vs 生产危险（快速对照）

| 机制 | 判定 | 说明 |
|------|------|------|
| 显式 `FORCE_STUB` / profile=dev mock / 本地 stub provider | **P0（非测试）** | 有开关也不行；删 stub，不要用 flag「关住」 |
| seed 超管 | **预期，勿报漏洞** | 可提醒改密文档 |
| deploy_dev / compose.dev 弱密钥 | 开发可接受 | 被当准生产且无轮换 → P0/P1 |
| Validate / reject-dev-defaults **已写未调用** 或缺失 | **P0 进程门禁失效** | — |
| CI/Helm 未拦 dev values，进程门禁已接线 | **P1 部署卫生** | 补 pipeline/values 校验 |

---

## §7 产品表面缺口（能力 vs 入口 vs 半成品）— 优先 P0/P1

对账三列：**服务端能力**（API/RPC/任务）× **全端入口**（Web / Desktop / Admin / CLI 若宣称）× **交互完整度**。

**「宣称」**（与 SKILL 一致，命中任一即算）：UI 交付语气文案；README/对外 docs/变更说明列为已交付；OpenAPI/SDK/对照表标 GA/shipped（非 experimental，且无「API only」限定）。

| 反模式 | 级别 | 为何致命 | 锚点（例） | 修法 |
|--------|------|----------|------------|------|
| 服务端已有完整能力，**已宣称**客户端**全端无入口**（无路由/菜单/命令） | P1 | 能力无法触达；交付幻觉在文档/API 层 | OpenAPI/路由清单有 handler，FE `routes`/`menu` 无对应；移动端/管理端同样缺失 | 补齐入口并接真 API；或**改宣称**为「仅 API / 未交付 UI」且对外材料同步 |
| 服务端有能力，**未宣称**且全端无入口 | P2 | 规划缺口，非假交付 | 无 README/UI 承诺 | 跟踪即可；勿当 P1 |
| 仅某一端有入口、其他**已宣称**端缺失 | P1 | 「全端一致」承诺落空 | 文档写 Desktop+Web，仅 Web 有页 | 补端或改宣称范围 |
| 有入口，但页常驻 **Skeleton / Loading**、永远 `loading=true`、或仅占位布局 | P0 | 用户以为功能在加载/已上线 | 无请求的 Skeleton、空 `useEffect`、TODO 注释旁的壳 | 接真实数据流；未就绪则撤入口 |
| 有入口，列表/详情/图表用 **假数据 / mockData / 写死数组** | P0 | 假绿表面 | `const data = [{id:1...}]`、faker 进主路径 | 接 API；无数据走空态+CTA |
| 有入口，**交互不完整**：按钮无 onClick、提交只 toast、CRUD 缺一截、表单不调 API、禁用「即将推出」却仍展示主 CTA | P0/P1 | 半成品当交付 | 空 handler、`console.log`、`alert('todo')`、只读假表单 | 补全主路径交互或隐藏入口 |
| 后端 501/NotImplemented，前端仍展示可点主流程 | P0 | 假绿 | FE 忽略错误码继续成功态 | 撤入口或接真实现 |

**扫法提示**：

1. 从后端列出「非 health/非内部」的业务路由或 use-case。
2. 用宣称判据圈定「应对用户可见」的能力子集；再在各端搜路由表、菜单、深链、命令注册。
3. 对已有入口的页面：查是否有真实 fetch/mutation、空态/错误态、主 CTA 是否闭环。
4. 骨架组件若仅用于首屏请求中的短暂 loading → 正常；若无请求或失败后仍骨架 → 报。
5. GraphQL / 事件驱动：用 schema 的 query/mutation 或可触发的 command 列表代替 REST 路由做能力清单。
6. 移动端（若宣称）：对账导航/Screen 注册，勿只扫 Web。

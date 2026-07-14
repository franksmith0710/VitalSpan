# Product Fact Card — VitalSpan

- name: VitalSpan
- one_liner: 面向政企/行业客户 IT 与数据团队的自研可配置 BI 分析平台，对标 DataEase / Apache Superset，零第三方 BI 运行时依赖
- audience_roles: [租户管理员, 数据工程师, 业务分析员, 决策者, 售前/技术选型方]
- in_scope:
  - 自研 BI 全链路：数据源、查询、仪表板、主题分析、报表、即席查询
  - 多类别外部数据源插件化接入（关系型、OLAP、时序、文档、搜索、API、文件等）
  - 库表级同步入平台托管分析库与轻量清洗（M1B）
  - 可配置 RBAC + 多维行级权限 + 默认视图与用户覆盖
  - 查询服务治理：工单审批、发布流水线、数据交换总线注册（四期）
  - Web 门户与开放 API（只读查询类）
  - 嵌入 iframe/SDK 对外展现
- out_of_scope:
  - 嵌入或 fork Superset/DataEase 作为生产组件
  - GPL 源码复用
  - 预置业务角色/场景包自动加载
  - 一至三期 Dataset 语义层（四期交付）
  - AI/SQL 智能问数
- highlights:
  - { claim: "自研可控，生产环境零 Superset/DataEase 运行时依赖", evidence_path: docs/automate/goal.md G1/NFR-08 }
  - { claim: "多类别数据源插件接入，新增类型不改核心框架", evidence_path: docs/automate/goal.md G2/NFR-04, docs/services/datasources.md }
  - { claim: "完整 BI 展现：仪表板、主题分析、报表、即席查询", evidence_path: docs/automate/goal.md G3, fe/src/routes.tsx }
  - { claim: "可配置 RBAC 与行级权限，菜单与视图按角色差异", evidence_path: docs/automate/goal.md G4, docs/ui/layout.md }
  - { claim: "查询服务治理与数据交换总线对接", evidence_path: docs/automate/goal.md G5, fe/src/routes.tsx governance/* }
  - { claim: "数据同步与轻量 ETL 入托管分析库", evidence_path: docs/services/ingestion.md, fe/src/routes.tsx ingestion/* }
- modules:
  - { name: 控制台, responsibility: 单应用管理壳层与 RBAC 导航, path: fe/src/layouts/AdminLayout.tsx }
  - { name: API 服务, responsibility: 统一 REST 入口与业务编排, path: backend/app/api/v1/ }
  - { name: 身份与权限, responsibility: RBAC、能力校验、行级权限, path: backend/app/auth/ }
  - { name: 数据源连接层, responsibility: 多类型连接器注册与凭证管理, path: backend/app/datasources/ }
  - { name: 数据同步, responsibility: 源库同步、ETL 规则、作业历史, path: backend/app/ingestion/ }
  - { name: 查询引擎, responsibility: SQL 与原生查询执行, path: backend/app/query/ }
  - { name: 仪表板, responsibility: 栅格/像素布局与图表消费, path: backend/app/dashboard/ }
  - { name: 治理与发布, responsibility: 工单、目录、发布与总线对接, path: backend/app/governance/ }
  - { name: 嵌入展现, responsibility: iframe/SDK 只读图表分享, path: fe/src/embed/ }
- deploy: 控制台 + API 服务 + 平台元数据库 + 可选托管分析库；支持内网私有化部署；嵌入面独立路由
- scenarios:
  - name: 多源接入到仪表板消费
    actors: [数据工程师, 租户管理员, 业务分析员]
    trigger: 需将外部业务库数据纳入统一分析入口
    success: 建源/同步成功 → 仪表板出数 → 授权用户可查看
    evidence_path: docs/automate/goal.md P1-SMOKE, fe/src/routes.tsx datasources/dashboards
  - name: 查询服务治理与总线发布
    actors: [业务分析员, 数据管理员, 审批人]
    trigger: 需将分析结果以受控服务对外发布
    success: 申请→审批→设计→发布→总线注册完成
    evidence_path: docs/automate/goal.md G5/P4-SMOKE, fe/src/routes.tsx governance/*
- metrics_safe:
  - PRD 合同项 129 项已实现（docs/automate/plan.md）
  - 连接器类型覆盖 CONN-001~027（含 API/文件收官扩展）
- gaps:
  - M-DEPTH companion 仍有 12 项深度体验待打磨（不影响合同交付）
  - 部分治理/元数据页面为 L1 诚实占位态（推断：售前演示需标注成熟度）

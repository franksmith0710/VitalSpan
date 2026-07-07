import {
  ArrowLeftRight,
  Boxes,
  Cable,
  Database,
  FileBarChart,
  GitBranch,
  Layers,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

export const ADMIN_NAV_GROUPS: NavSection[] = [
  {
    title: "数据",
    items: [
      {
        name: "数据源",
        icon: <Database className="size-6" aria-hidden />,
        path: "/admin/datasources",
      },
      {
        name: "连接器",
        icon: <Cable className="size-6" aria-hidden />,
        path: "/admin/connectors",
      },
      {
        name: "数据接入",
        icon: <ArrowLeftRight className="size-6" aria-hidden />,
        path: "/admin/ingestion/sync-jobs",
      },
    ],
  },
  {
    title: "分析",
    items: [
      {
        name: "Dashboard",
        icon: <LayoutDashboard className="size-6" aria-hidden />,
        path: "/admin/dashboards",
      },
      {
        name: "图表探索",
        icon: <LineChart className="size-6" aria-hidden />,
        path: "/admin/charts/explore",
      },
      {
        name: "查询设计器",
        icon: <SlidersHorizontal className="size-6" aria-hidden />,
        path: "/admin/designer",
      },
      {
        name: "预制报表",
        icon: <FileBarChart className="size-6" aria-hidden />,
        path: "/admin/reports",
      },
      {
        name: "报表模板",
        icon: <FileBarChart className="size-6" aria-hidden />,
        path: "/admin/reports/templates",
      },
      {
        name: "报表调度",
        icon: <Workflow className="size-6" aria-hidden />,
        path: "/admin/reports/schedules",
      },
    ],
  },
  {
    title: "主题与实体",
    items: [
      {
        name: "实体总览",
        icon: <Boxes className="size-6" aria-hidden />,
        path: "/admin/entities/overview",
      },
      {
        name: "主题分析",
        icon: <Layers className="size-6" aria-hidden />,
        path: "/admin/themes/default",
      },
    ],
  },
  {
    title: "治理",
    items: [
      {
        name: "接口目录",
        icon: <GitBranch className="size-6" aria-hidden />,
        path: "/admin/governance/catalog",
      },
      {
        name: "治理工单",
        icon: <Workflow className="size-6" aria-hidden />,
        path: "/admin/governance/tickets",
      },
      {
        name: "发布流水线",
        icon: <ScrollText className="size-6" aria-hidden />,
        path: "/admin/governance/publish",
      },
    ],
  },
  {
    title: "语义层",
    items: [
      {
        name: "元数据",
        icon: <Boxes className="size-6" aria-hidden />,
        path: "/admin/metadata",
      },
      {
        name: "Dataset",
        icon: <Database className="size-6" aria-hidden />,
        path: "/admin/datasets",
      },
    ],
  },
  {
    title: "系统",
    items: [
      {
        name: "角色管理",
        icon: <Shield className="size-6" aria-hidden />,
        path: "/admin/system/roles",
      },
      {
        name: "用户管理",
        icon: <Users className="size-6" aria-hidden />,
        path: "/admin/system/users",
      },
      {
        name: "组织架构",
        icon: <GitBranch className="size-6" aria-hidden />,
        path: "/admin/system/orgs",
      },
      {
        name: "行级权限",
        icon: <Shield className="size-6" aria-hidden />,
        path: "/admin/system/rls",
      },
      {
        name: "审计日志",
        icon: <ScrollText className="size-6" aria-hidden />,
        path: "/admin/system/audit",
      },
    ],
  },
];

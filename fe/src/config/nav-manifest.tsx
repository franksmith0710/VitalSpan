import type React from "react";
import {
  ArrowLeftRight,
  Boxes,
  Database,
  FileBarChart,
  GitBranch,
  LayoutDashboard,
  Layers,
  LineChart,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import type { SessionRole } from "@/lib/session";

type NavManifestSubItem = {
  name: string;
  path: string;
  milestone?: string;
  capability?: string;
};

type NavManifestItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavManifestSubItem[];
  milestone?: string;
  roles?: SessionRole[];
  capability?: string;
};

type NavManifestSection = {
  title: string;
  items: NavManifestItem[];
  roles: SessionRole[];
  capability?: string;
};

export const NAV_MANIFEST: NavManifestSection[] = [
  {
    title: "数据",
    roles: ["admin"],
    capability: "datasource:*",
    items: [
      {
        name: "数据连接",
        icon: <Database className="size-6" aria-hidden />,
        milestone: "M1",
        subItems: [
          { name: "连接管理", path: "/admin/datasources", milestone: "M1" },
          { name: "连接器类型", path: "/admin/connectors", milestone: "M1" },
        ],
      },
      {
        name: "数据接入",
        icon: <ArrowLeftRight className="size-6" aria-hidden />,
        path: "/admin/ingestion/sync-jobs",
        milestone: "M1",
      },
    ],
  },
  {
    title: "分析",
    roles: ["admin", "analyst", "viewer"],
    items: [
      {
        name: "Dashboard",
        icon: <LayoutDashboard className="size-6" aria-hidden />,
        path: "/admin/dashboards",
        milestone: "M1",
        capability: "dashboard:read",
      },
      {
        name: "图表探索",
        icon: <LineChart className="size-6" aria-hidden />,
        path: "/admin/charts/explore",
        milestone: "M11",
        capability: "dashboard:edit",
      },
      {
        name: "查询设计器",
        icon: <SlidersHorizontal className="size-6" aria-hidden />,
        path: "/admin/designer",
        milestone: "M13",
        capability: "dashboard:edit",
      },
    ],
  },
  {
    title: "报表",
    roles: ["admin", "analyst", "viewer"],
    items: [
      {
        name: "报表",
        icon: <FileBarChart className="size-6" aria-hidden />,
        subItems: [
          { name: "预制报表", path: "/admin/reports", milestone: "M1", capability: "report:read" },
          {
            name: "报表模板",
            path: "/admin/reports/templates",
            milestone: "M7",
            capability: "report:*",
          },
          {
            name: "报表调度",
            path: "/admin/reports/schedules",
            milestone: "M11",
            capability: "report:*",
          },
        ],
      },
    ],
  },
  {
    title: "主题与实体",
    roles: ["admin", "analyst"],
    capability: "theme:*",
    items: [
      {
        name: "实体总览",
        icon: <Boxes className="size-6" aria-hidden />,
        path: "/admin/entities/overview",
        milestone: "M7",
      },
      {
        name: "主题分析",
        icon: <Layers className="size-6" aria-hidden />,
        path: "/admin/themes/default",
        milestone: "M7",
      },
    ],
  },
  {
    title: "治理",
    roles: ["admin"],
    capability: "governance:*",
    items: [
      {
        name: "接口目录",
        icon: <GitBranch className="size-6" aria-hidden />,
        path: "/admin/governance/catalog",
        milestone: "M1",
      },
      {
        name: "治理工单",
        icon: <Workflow className="size-6" aria-hidden />,
        path: "/admin/governance/tickets",
        milestone: "M13",
      },
      {
        name: "发布流水线",
        icon: <ScrollText className="size-6" aria-hidden />,
        path: "/admin/governance/publish",
        milestone: "M13",
      },
    ],
  },
  {
    title: "语义层",
    roles: ["admin"],
    items: [
      {
        name: "元数据",
        icon: <Boxes className="size-6" aria-hidden />,
        path: "/admin/metadata",
        milestone: "M13",
        capability: "metadata:*",
      },
      {
        name: "Dataset",
        icon: <Database className="size-6" aria-hidden />,
        path: "/admin/datasets",
        milestone: "M13",
        capability: "dataset:*",
      },
    ],
  },
  {
    title: "系统",
    roles: ["admin"],
    capability: "system:*",
    items: [
      {
        name: "角色管理",
        icon: <Shield className="size-6" aria-hidden />,
        path: "/admin/system/roles",
        milestone: "M1",
      },
      {
        name: "资源授权",
        icon: <Shield className="size-6" aria-hidden />,
        path: "/admin/system/grants",
        milestone: "M1",
        capability: "system:*",
      },
      {
        name: "用户管理",
        icon: <Users className="size-6" aria-hidden />,
        path: "/admin/system/users",
        milestone: "M1",
      },
      {
        name: "组织架构",
        icon: <GitBranch className="size-6" aria-hidden />,
        path: "/admin/system/orgs",
        milestone: "M1",
      },
      {
        name: "行级权限",
        icon: <Shield className="size-6" aria-hidden />,
        path: "/admin/system/rls",
        milestone: "M1",
      },
      {
        name: "审计日志",
        icon: <ScrollText className="size-6" aria-hidden />,
        path: "/admin/system/audit",
        milestone: "M1",
      },
    ],
  },
];

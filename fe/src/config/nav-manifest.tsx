import type React from "react";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  Database,
  FileBarChart,
  LayoutDashboard,
  Layers,
  PieChart,
  ScrollText,
  Server,
  Shield,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import type { SessionRole } from "@/lib/session";

type IaTier = "core" | "engineering";
type IaPriority = "primary" | "advanced";

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
  iaPriority?: IaPriority;
  badgeLabel?: string;
};

type NavManifestSection = {
  title: string;
  items: NavManifestItem[];
  roles: SessionRole[];
  capability?: string;
  iaTier?: IaTier;
};

export const NAV_MANIFEST: NavManifestSection[] = [
  {
    title: "数据",
    roles: ["admin"],
    iaTier: "engineering",
    items: [
      {
        name: "数据连接",
        icon: <Database className="size-5" aria-hidden />,
        path: "/admin/datasources",
        milestone: "M1",
        capability: "datasource:*",
      },
      {
        name: "数据接入",
        icon: <ArrowLeftRight className="size-5" aria-hidden />,
        path: "/admin/ingestion/sync-jobs",
        milestone: "M1",
        capability: "datasource:*",
      },
      {
        name: "语义建模",
        icon: <Layers className="size-5" aria-hidden />,
        milestone: "M13",
        subItems: [
          {
            name: "元数据",
            path: "/admin/metadata",
            milestone: "M13",
            capability: "metadata:*",
          },
          {
            name: "Dataset",
            path: "/admin/datasets",
            milestone: "M13",
            capability: "dataset:*",
          },
        ],
      },
      {
        name: "实体与主题",
        icon: <Boxes className="size-5" aria-hidden />,
        milestone: "M7",
        capability: "theme:*",
        subItems: [
          { name: "实体总览", path: "/admin/entities/overview", milestone: "M7" },
          { name: "主题分析", path: "/admin/themes/default", milestone: "M7" },
        ],
      },
    ],
  },
  {
    title: "分析",
    roles: ["admin", "analyst", "viewer"],
    items: [
      {
        name: "Dashboard",
        icon: <LayoutDashboard className="size-5" aria-hidden />,
        path: "/admin/dashboards",
        milestone: "M1",
      },
    ],
  },
  {
    title: "报表",
    roles: ["admin", "analyst", "viewer"],
    items: [
      {
        name: "报表中心",
        icon: <FileBarChart className="size-5" aria-hidden />,
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
    title: "治理",
    roles: ["admin"],
    iaTier: "engineering",
    capability: "governance:*",
    items: [
      {
        name: "治理流程",
        icon: <Workflow className="size-5" aria-hidden />,
        subItems: [
          { name: "接口目录", path: "/admin/governance/catalog", milestone: "M1" },
          { name: "治理工单", path: "/admin/governance/tickets", milestone: "M13" },
          { name: "发布流水线", path: "/admin/governance/publish", milestone: "M13" },
        ],
      },
      {
        name: "查询服务",
        icon: <Server className="size-5" aria-hidden />,
        path: "/admin/services",
        milestone: "M13",
        capability: "governance:*",
      },
      {
        name: "图表类型目录",
        icon: <PieChart className="size-5" aria-hidden />,
        path: "/admin/charts/types",
        milestone: "M11",
        capability: "governance:*",
      },
      {
        name: "查询设计器",
        icon: <SlidersHorizontal className="size-5" aria-hidden />,
        path: "/admin/designer",
        milestone: "M13",
        capability: "governance:*",
        badgeLabel: "治理专用",
      },
    ],
  },
  {
    title: "系统",
    roles: ["admin"],
    capability: "system:*",
    items: [
      {
        name: "权限与安全",
        icon: <Shield className="size-5" aria-hidden />,
        subItems: [
          { name: "角色管理", path: "/admin/system/roles", milestone: "M1" },
          { name: "用户管理", path: "/admin/system/users", milestone: "M1" },
          {
            name: "资源授权",
            path: "/admin/system/grants",
            milestone: "M1",
            capability: "system:*",
          },
          { name: "行级权限", path: "/admin/system/rls", milestone: "M1" },
        ],
      },
      {
        name: "组织架构",
        icon: <Building2 className="size-5" aria-hidden />,
        path: "/admin/system/orgs",
        milestone: "M1",
      },
      {
        name: "审计日志",
        icon: <ScrollText className="size-5" aria-hidden />,
        path: "/admin/system/audit",
        milestone: "M1",
      },
    ],
  },
];

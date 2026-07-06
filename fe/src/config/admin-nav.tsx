import { ArrowLeftRight, Boxes, Cable, Database, FileBarChart, Layers, LayoutDashboard, Shield, Users } from "lucide-react";
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
        name: "预制报表",
        icon: <FileBarChart className="size-6" aria-hidden />,
        path: "/admin/reports",
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
    ],
  },
];

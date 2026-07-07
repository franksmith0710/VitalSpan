import {
  FileBarChart,
  Layers,
  LayoutDashboard,
  LineChart,
  SlidersHorizontal,
  Workflow,
  Boxes,
} from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

/** 分析师 / 设计者：分析、报表与主题配置（无数据接入与系统管理） */
export const ANALYST_NAV_GROUPS: NavSection[] = [
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
];

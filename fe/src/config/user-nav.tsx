import { FileBarChart, LayoutDashboard } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

/** 查看者：授权范围内的消费入口 */
export const USER_NAV_GROUPS: NavSection[] = [
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
];

import { Database, Settings } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

export const ADMIN_NAV_GROUPS: NavSection[] = [
  {
    title: "数据",
    items: [
      {
        name: "数据源",
        icon: <Database className="size-6" aria-hidden />,
        path: "/admin",
      },
    ],
  },
  {
    title: "系统",
    items: [
      {
        name: "用户管理",
        icon: <Settings className="size-6" aria-hidden />,
        path: "#",
      },
    ],
  },
];

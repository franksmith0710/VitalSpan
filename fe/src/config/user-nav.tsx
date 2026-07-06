import { LayoutDashboard } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

export const USER_NAV_GROUPS: NavSection[] = [
  {
    title: "分析",
    items: [
      {
        name: "Dashboard",
        icon: <LayoutDashboard className="size-6" aria-hidden />,
        path: "/admin/dashboards",
      },
    ],
  },
];

import { Building2, ScrollText, Shield } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";

/** 后台管理侧栏；从用户菜单进入时替换工作台导航 */
export const SYSTEM_ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "后台管理",
    items: [
      {
        name: "权限与安全",
        icon: <Shield className="size-5" aria-hidden />,
        subItems: [
          { name: "角色管理", path: "/admin/system/roles" },
          { name: "用户管理", path: "/admin/system/users" },
          { name: "资源授权", path: "/admin/system/grants" },
          { name: "行级权限", path: "/admin/system/rls" },
        ],
      },
      {
        name: "组织架构",
        icon: <Building2 className="size-5" aria-hidden />,
        path: "/admin/system/orgs",
      },
      {
        name: "审计日志",
        icon: <ScrollText className="size-5" aria-hidden />,
        path: "/admin/system/audit",
      },
    ],
  },
];

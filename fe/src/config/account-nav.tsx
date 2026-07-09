import { Shield, SlidersHorizontal, User } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";
import {
  ACCOUNT_PREFERENCES_PATH,
  ACCOUNT_PROFILE_PATH,
  ACCOUNT_SECURITY_PATH,
} from "@/lib/workspace";

/** 个人中心侧栏；从用户菜单进入时替换工作台导航 */
export const ACCOUNT_NAV_SECTIONS: NavSection[] = [
  {
    title: "个人中心",
    items: [
      {
        name: "个人资料",
        icon: <User className="size-6" aria-hidden />,
        path: ACCOUNT_PROFILE_PATH,
      },
      {
        name: "偏好设置",
        icon: <SlidersHorizontal className="size-6" aria-hidden />,
        path: ACCOUNT_PREFERENCES_PATH,
      },
      {
        name: "安全设置",
        icon: <Shield className="size-6" aria-hidden />,
        path: ACCOUNT_SECURITY_PATH,
      },
    ],
  },
];

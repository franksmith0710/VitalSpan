import { Settings, User } from "lucide-react";
import type { NavSection } from "@/components/layout/app-sidebar";
import { ACCOUNT_PROFILE_PATH, ACCOUNT_SETTINGS_PATH } from "@/lib/workspace";

/** 账号管理区侧栏（个人资料 / 账号设置）；从用户菜单进入时替换工作台导航 */
export const ACCOUNT_NAV_SECTIONS: NavSection[] = [
  {
    title: "账号",
    items: [
      {
        name: "个人资料",
        icon: <User className="size-6" aria-hidden />,
        path: ACCOUNT_PROFILE_PATH,
      },
      {
        name: "账号设置",
        icon: <Settings className="size-6" aria-hidden />,
        path: ACCOUNT_SETTINGS_PATH,
      },
    ],
  },
];

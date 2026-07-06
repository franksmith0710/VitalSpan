import * as React from "react";
import { Link } from "react-router";
import { ArrowLeft, ChevronDown, LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/context/workspace-context";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromAuth } from "@/lib/session";
import {
  ACCOUNT_PROFILE_PATH,
  ACCOUNT_SETTINGS_PATH,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

export function UserDropdown({ className }: { className?: string }) {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? sessionUserFromAuth(authUser.username, authUser.roles)
    : sessionUserFromAuth("用户", ["viewer"]);
  const { canReturnToWorkspace, returnToWorkspace, beginAccountManagement } =
    useWorkspace();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "dropdown-toggle flex items-center text-gray-700 dark:text-gray-400",
            className,
          )}
          aria-label="用户菜单"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="mr-1 hidden font-medium text-theme-sm sm:block">
            {user.name}
          </span>
          <ChevronDown
            className={cn(
              "size-[18px] stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[260px] rounded-2xl border-gray-200 p-3 shadow-theme-lg dark:border-gray-800"
      >
        <div className="min-w-0">
          <span className="block font-medium text-theme-sm text-gray-700 dark:text-gray-400">
            {user.name}
          </span>
          <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          {canReturnToWorkspace ? (
            <li>
              <DropdownMenuItem
                onSelect={() => {
                  returnToWorkspace();
                  setOpen(false);
                }}
                className="gap-3 px-3 py-2 font-medium text-gray-700 dark:text-gray-400"
              >
                <ArrowLeft className="size-5" aria-hidden />
                返回工作台
              </DropdownMenuItem>
            </li>
          ) : null}

          <li>
            <DropdownMenuItem asChild>
              <Link
                to={ACCOUNT_PROFILE_PATH}
                className="gap-3 px-3 py-2 font-medium text-gray-700 dark:text-gray-400"
                onClick={() => {
                  beginAccountManagement();
                  setOpen(false);
                }}
              >
                <User className="size-5" aria-hidden />
                个人资料
              </Link>
            </DropdownMenuItem>
          </li>
          <li>
            <DropdownMenuItem asChild>
              <Link
                to={ACCOUNT_SETTINGS_PATH}
                className="gap-3 px-3 py-2 font-medium text-gray-700 dark:text-gray-400"
                onClick={() => {
                  beginAccountManagement();
                  setOpen(false);
                }}
              >
                <Settings className="size-5" aria-hidden />
                账号设置
              </Link>
            </DropdownMenuItem>
          </li>
        </ul>

        <DropdownMenuSeparator className="my-0" />

        <DropdownMenuItem
          onSelect={() => {
            logout();
            setOpen(false);
          }}
          className="group mt-1 flex cursor-pointer items-center gap-3 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <LogOut
            className="size-5 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            aria-hidden
          />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

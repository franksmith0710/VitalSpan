import { Link, useLocation } from "react-router";
import { Settings } from "lucide-react";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { useAuth } from "@/context/auth-context";
import { useWorkspace } from "@/context/workspace-context";
import { canManagePlatform, sessionUserFromMe } from "@/lib/session";
import { isSystemAdminPath, SYSTEM_ADMIN_HOME_PATH } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export function SystemAdminHeaderButton({ className }: { className?: string }) {
  const location = useLocation();
  const { beginSystemAdmin } = useWorkspace();
  const { user: authUser } = useAuth();
  const user = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "用户", roles: ["viewer"], permissions: [], isRoot: false });

  if (!canManagePlatform(user) || isSystemAdminPath(location.pathname)) {
    return null;
  }

  return (
    <HintTooltip label="系统管理">
      <Link
        to={SYSTEM_ADMIN_HOME_PATH}
        onClick={() => beginSystemAdmin()}
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
          className,
        )}
        aria-label="系统管理"
      >
        <Settings className="size-5" aria-hidden />
      </Link>
    </HintTooltip>
  );
}

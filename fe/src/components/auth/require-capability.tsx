import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromMe, type SessionUser } from "@/lib/session";
import { WORKSPACE_HOME_PATH } from "@/lib/workspace";

type RequireCapabilityProps = {
  check: (user: SessionUser) => boolean;
  children: ReactNode;
  fallbackTo?: string;
};

function ForbiddenState() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-theme-sm text-gray-600 dark:text-gray-400">
        无权访问此功能，请联系管理员开通权限。
      </CardContent>
    </Card>
  );
}

export function RequireCapability({
  check,
  children,
  fallbackTo,
}: RequireCapabilityProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const session = sessionUserFromMe(user);
  if (!check(session)) {
    return fallbackTo ? <Navigate to={fallbackTo} replace /> : <ForbiddenState />;
  }

  return children;
}

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireCapability
      check={(u) => u.roles.includes("admin")}
      fallbackTo={WORKSPACE_HOME_PATH}
    >
      {children}
    </RequireCapability>
  );
}

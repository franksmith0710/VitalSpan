import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { resolveDefaultDashboardPath } from "@/lib/defaultViewResolve";

export function AdminHomePage() {
  const { user, isLoading } = useAuth();
  const [redirect, setRedirect] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading || !user) return;
    void resolveDefaultDashboardPath(user.roles).then((path) => {
      setRedirect(path ?? "/admin/dashboards");
    });
  }, [user, isLoading]);

  if (isLoading || redirect === undefined) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return <Navigate to={redirect ?? "/admin/dashboards"} replace />;
}

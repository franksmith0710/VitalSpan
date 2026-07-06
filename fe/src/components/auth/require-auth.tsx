import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/context/auth-context";
import { getAuthToken } from "@/lib/auth-token";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const hasToken = Boolean(getAuthToken());

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

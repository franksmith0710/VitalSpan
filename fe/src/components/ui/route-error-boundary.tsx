import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mapApiError } from "@/lib/apiError";
import { WORKSPACE_HOME_PATH } from "@/lib/workspace";

type BoundaryState = { error: Error | null };

type RouteErrorBoundaryClassProps = {
  children: ReactNode;
  scope: "route" | "app";
};

class RouteErrorBoundaryClass extends Component<
  RouteErrorBoundaryClassProps,
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.scope === "app" ? "[AppErrorBoundary]" : "[RouteErrorBoundary]";
    console.error(tag, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isApp = this.props.scope === "app";
    return (
      <div
        role="alert"
        className={
          isApp
            ? "flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900"
            : "flex min-h-[240px] flex-1 flex-col items-center justify-center p-6"
        }
      >
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-error-500" aria-hidden />
            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {isApp ? "应用加载失败" : "页面加载失败"}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {import.meta.env.DEV && error.message
                ? error.message
                : mapApiError(error)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={this.handleRetry}>
                重试
              </Button>
              {!isApp ? (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link to={WORKSPACE_HOME_PATH}>返回首页</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  刷新页面
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

/** 路由切换时随 pathname remount，自动清除上一页错误态 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundaryClass key={pathname} scope="route">
      {children}
    </RouteErrorBoundaryClass>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return <RouteErrorBoundaryClass scope="app">{children}</RouteErrorBoundaryClass>;
}

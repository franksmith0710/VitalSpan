import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dwStateError } from "./dashboardWidgetTypography";
import { cn } from "@/lib/utils";

type WidgetErrorBoundaryProps = {
  widgetTitle?: string;
  onRetry?: () => void;
  onDelete?: () => void;
  children: ReactNode;
};

type WidgetErrorBoundaryState = {
  error: Error | null;
};

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[WidgetErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.widgetTitle ? `「${this.props.widgetTitle}」` : "该组件";
    return (
      <div
        role="alert"
        className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-error-500/40 bg-error-50/80 p-4 dark:bg-error-500/10"
      >
        <AlertTriangle className="size-5 text-error-500" aria-hidden />
        <p className={cn("text-center text-theme-sm", dwStateError)}>
          {label}渲染失败：{error.message || "未知错误"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={this.handleRetry}>
            重试
          </Button>
          {this.props.onDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={this.props.onDelete}>
              删除组件
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
}

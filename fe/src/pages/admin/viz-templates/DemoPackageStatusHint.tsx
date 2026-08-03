import { CircleCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

type DemoPackageStatusHintProps = {
  ready: boolean;
  message?: string | null;
  className?: string;
};

/** 模板 Hub 演示数据状态：单行紧凑提示，就绪时不占整行 Alert 高度 */
export function DemoPackageStatusHint({
  ready,
  message,
  className,
}: DemoPackageStatusHintProps) {
  if (ready) {
    return (
      <p
        role="status"
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-success-200/80 bg-success-50 px-2.5 py-1 text-theme-xs leading-snug text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400",
          className,
        )}
      >
        <CircleCheck className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">
          官方演示数据已就绪
          <span className="text-success-600/85 dark:text-success-400/85">
            {" "}
            · 模板预览将使用「示例数据」
          </span>
        </span>
      </p>
    );
  }

  return (
    <p
      role="alert"
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg border border-warning-200/80 bg-warning-50 px-2.5 py-1 text-theme-xs leading-snug text-warning-800 dark:border-warning-500/25 dark:bg-warning-500/10 dark:text-warning-300",
        className,
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">
        官方演示数据尚未就绪
        {message ? `：${message}` : "，请启动示例 MySQL 并检查「示例数据」连接。"}
      </span>
      <Link
        to="/admin/datasources"
        className="shrink-0 font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
      >
        前往数据连接
      </Link>
    </p>
  );
}

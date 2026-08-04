import { useCallback, useEffect, useState } from "react";
import { BarChart3, LayoutDashboard, Loader2, X } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { mapApiError } from "@/lib/apiError";
import {
  ensureSyncDataset,
  fetchConsumeHints,
  prepareSyncConsume,
  type SyncJobConsumeHints,
} from "@/lib/syncConsumeApi";

type SyncConsumeActionCardProps = {
  jobId: string;
  jobName?: string;
  targetTable: string;
  rowsSynced?: number | null;
  canManage?: boolean;
  onDismiss?: () => void;
  onUpdated?: () => void;
  className?: string;
};

export function SyncConsumeActionCard({
  jobId,
  jobName,
  targetTable,
  rowsSynced,
  canManage = false,
  onDismiss,
  onUpdated,
  className,
}: SyncConsumeActionCardProps) {
  const [hints, setHints] = useState<SyncJobConsumeHints | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHints = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchConsumeHints(jobId);
      setHints(data);
      return data;
    } catch (err) {
      setError(mapApiError(err));
      return null;
    }
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data = await refreshHints();
      if (cancelled || !data) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (canManage && data.nextAction === "prepare") {
        setPreparing(true);
        try {
          await prepareSyncConsume(jobId);
          const next = await refreshHints();
          if (!cancelled && next?.analyticsReady) {
            onUpdated?.();
          }
        } catch (err) {
          if (!cancelled) setError(mapApiError(err));
        } finally {
          if (!cancelled) setPreparing(false);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, canManage, refreshHints, onUpdated]);

  const handleEnsureDataset = async () => {
    setEnsuring(true);
    setError(null);
    try {
      const result = await ensureSyncDataset(jobId);
      await refreshHints();
      onUpdated?.();
      toast.success(
        result.created
          ? `数据集「${result.datasetId}」已创建并绑定`
          : `数据集「${result.datasetId}」已绑定查询配置`,
      );
    } catch (err) {
      const message = mapApiError(err);
      setError(message);
      toast.error(message);
    } finally {
      setEnsuring(false);
    }
  };

  const title = jobName ? `任务「${jobName}」同步成功 · 下一步出图` : "同步成功 · 下一步出图";

  const busy = loading || preparing || ensuring;

  return (
    <Alert variant="info" className={className}>
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <AlertTitle className="mb-0">{title}</AlertTitle>
            {onDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                aria-label="关闭引导"
                onClick={onDismiss}
              >
                <X className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>

          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            数据已写入托管分析库表
            <span className="font-mono text-theme-xs"> {targetTable}</span>
            {rowsSynced != null ? `（本次 ${rowsSynced} 行）` : ""}。系统会自动登记分析库；你只需一键创建 Dataset 即可出图。
          </p>

          {error ? (
            <p className="text-theme-sm text-error-600 dark:text-error-400">{error}</p>
          ) : null}

          {busy && !hints ? (
            <div className="flex items-center gap-2 text-theme-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              正在准备分析库…
            </div>
          ) : null}

          {hints?.nextAction === "ensure_dataset" && canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy}
                loading={ensuring}
                onClick={() => void handleEnsureDataset()}
              >
                一键创建数据集并绑定
              </Button>
            </div>
          ) : null}

          {hints?.nextAction === "open_dashboard" ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary" size="sm">
                <Link to="/admin/dashboards">创建看板</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/datasets/${hints.datasetId}/edit`}>
                  <LayoutDashboard className="size-4" aria-hidden />
                  查看数据集
                </Link>
              </Button>
            </div>
          ) : null}

          {hints?.nextAction === "prepare" && !canManage ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              分析库尚未就绪，请联系管理员完成托管分析库配置。
            </p>
          ) : null}

          <details className="text-theme-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300">
              高级：手动登记分析库
            </summary>
            <p className="mt-2">
              通常无需手动操作。若需覆盖连接，可前往
              <Link
                to="/admin/datasources/new"
                className="mx-1 text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                连接管理
              </Link>
              登记 PostgreSQL 分析库（端口 5433，库 analytics）。
            </p>
          </details>
        </div>
      </div>
    </Alert>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAiVizArtifacts } from "@/lib/aiVizArtifacts";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import {
  AiVizArtifactDeleteDialog,
  type AiVizArtifactDeleteTarget,
} from "./AiVizArtifactDeleteDialog";

type AiVizArtifactsHubSectionProps = {
  canManage: boolean;
  className?: string;
};

/** 管理端：AI 自定义组件库列表与删除 */
export function AiVizArtifactsHubSection({ canManage, className }: AiVizArtifactsHubSectionProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AiVizArtifactDeleteTarget | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.aiViz.list({ limit: 50, offset: 0 }),
    queryFn: () => fetchAiVizArtifacts(50, 0),
    enabled: canManage,
  });

  const items = listQuery.data?.items ?? [];

  if (!canManage) return null;

  return (
    <section className={cn("space-y-3 border-t border-gray-200 pt-6 dark:border-gray-800", className)}>
      <div>
        <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white">AI 自定义组件</h2>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          在 AI 组件工作台生成并入库的可视化组件；可在看板编辑器中插入或在此移除。
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          暂无 AI 自定义组件。请先在 AI 组件工作台生成并入库。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const label = item.manifest.displayName ?? item.manifest.id ?? "自定义组件";
            return (
              <div
                key={item.artifactId}
                className="relative flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-2 text-center dark:border-gray-800"
                data-testid={`ai-viz-hub-tile-${item.artifactId}`}
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-brand-500 dark:bg-white/[0.06]">
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <span className="line-clamp-2 w-full text-[11px] leading-tight text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-error-600 hover:text-error-700 dark:text-error-400"
                  aria-label={`从组件库移除 ${label}`}
                  onClick={() =>
                    setDeleteTarget({ artifactId: item.artifactId, label })
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  移除
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AiVizArtifactDeleteDialog
        target={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.aiViz.all });
        }}
      />
    </section>
  );
}

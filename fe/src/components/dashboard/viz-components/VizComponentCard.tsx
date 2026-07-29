import { Link } from "react-router";
import { Archive, Copy, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComponentPayloadPreview } from "@/components/dashboard/viz-components/ComponentPayloadPreview";
import {
  CATEGORY_ACCENT,
  COMPONENT_ACTIONS,
  surfaceLabel,
  widgetTypeLabel,
} from "@/components/dashboard/viz-components/componentLabels";
import type { VizComponentListItem, VizComponentPayload } from "@/lib/vizComponents";
import { cn } from "@/lib/utils";

type VizComponentCardProps = {
  item: VizComponentListItem;
  payload?: VizComponentPayload;
  payloadLoading?: boolean;
  canManage: boolean;
  pending?: boolean;
  onInsert: () => void;
  onViewReferences: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function VizComponentCard({
  item,
  payload,
  payloadLoading = false,
  canManage,
  pending = false,
  onInsert,
  onViewReferences,
  onPublish,
  onArchive,
  onDelete,
}: VizComponentCardProps) {
  const accent = CATEGORY_ACCENT[item.categoryKey] ?? CATEGORY_ACCENT.general;
  const showPublish = canManage && item.status === "draft";
  const showArchive = canManage && item.status === "published";
  const referenceCount = item.referenceCount ?? 0;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      toast.success("组件 ID 已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-theme-xs",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-theme-md",
        "border-gray-200 dark:border-gray-800 dark:bg-white/[0.03]",
        "hover:border-brand-200 dark:hover:border-brand-500/40",
      )}
      data-testid={`viz-component-card-${item.id}`}
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", accent)} aria-hidden />

      <div className="relative aspect-[16/10] overflow-hidden border-b border-gray-100 dark:border-white/[0.06]">
        <ComponentPayloadPreview
          componentId={item.id}
          componentName={item.name}
          widgetType={item.widgetType}
          payload={payload}
          payloadLoading={payloadLoading}
          categoryKey={item.categoryKey}
          visibility={item.visibility}
          status={item.status}
          className="h-full"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <header className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-theme-sm font-semibold leading-snug text-gray-900 dark:text-white">
              {item.name}
            </h2>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {(item.surfaceKinds ?? []).map((sk) => (
                <span
                  key={sk}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
                >
                  {surfaceLabel(sk)}
                </span>
              ))}
            </div>
          </div>

          {item.description ? (
            <p className="line-clamp-2 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {widgetTypeLabel(item.widgetType)} · v{item.contentRevision}
            </p>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1 text-theme-xs text-brand-600 hover:underline dark:text-brand-400"
            onClick={onViewReferences}
          >
            <Link2 className="size-3" aria-hidden />
            引用 {referenceCount} 处
          </button>
        </header>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="primary" disabled={pending} asChild>
            <Link to={`/admin/viz-components/${item.id}/edit`}>
              <Pencil className="size-3.5" aria-hidden />
              {COMPONENT_ACTIONS.edit}
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onInsert}>
            {COMPONENT_ACTIONS.insert}
          </Button>
          {showPublish ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onPublish}>
              {COMPONENT_ACTIONS.publish}
            </Button>
          ) : null}
          {showArchive ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onArchive}>
              <Archive className="size-3.5" aria-hidden />
              {COMPONENT_ACTIONS.archive}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="px-2"
                disabled={pending}
                aria-label="更多操作"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem onClick={onViewReferences}>
                <Link2 className="size-4" aria-hidden />
                {COMPONENT_ACTIONS.references}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void copyId()}>
                <Copy className="size-4" aria-hidden />
                复制组件 ID
              </DropdownMenuItem>
              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-error-600 focus:text-error-600 dark:text-error-400"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {COMPONENT_ACTIONS.delete}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}

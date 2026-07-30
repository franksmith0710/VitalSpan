import { Link } from "react-router";
import { Archive, Copy, Link2, MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComponentPayloadPreview } from "@/components/dashboard/viz-components/ComponentPayloadPreview";
import {
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
  const showPublish = canManage && item.status === "draft";
  const showArchive = canManage && item.status === "published";
  const referenceCount = item.referenceCount ?? 0;
  const surfaces = item.surfaceKinds ?? [];
  const metaLine = item.description
    ? item.description
    : `${widgetTypeLabel(item.widgetType)} · v${item.contentRevision}`;

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
        "group flex flex-col overflow-hidden rounded-xl border bg-white shadow-theme-xs",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-theme-md",
        "border-gray-200 dark:border-gray-800 dark:bg-white/[0.03]",
        "hover:border-brand-200 dark:hover:border-brand-500/40",
      )}
      data-testid={`viz-component-card-${item.id}`}
    >
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

      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="flex min-w-0 items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
              {item.name}
            </h2>
            <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {metaLine}
            </p>
          </div>
          {surfaces.length > 0 ? (
            <div className="flex max-w-[42%] shrink-0 flex-wrap justify-end gap-0.5">
              {surfaces.map((sk) => (
                <span
                  key={sk}
                  className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-medium leading-4 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
                >
                  {surfaceLabel(sk)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex min-w-0 items-center gap-1 truncate text-theme-xs text-brand-600 hover:underline dark:text-brand-400"
            onClick={onViewReferences}
          >
            <Link2 className="size-3 shrink-0" aria-hidden />
            引用 {referenceCount}
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button type="button" size="sm" variant="primary" className="h-7 px-2.5" disabled={pending} asChild>
              <Link to={`/admin/viz-components/${item.id}/edit`}>
                <Pencil className="size-3.5" aria-hidden />
                {COMPONENT_ACTIONS.edit}
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5"
              disabled={pending}
              onClick={onInsert}
            >
              插入
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  aria-label="更多操作"
                >
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem onClick={onInsert}>
                  <Upload className="size-4" aria-hidden />
                  {COMPONENT_ACTIONS.insert}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewReferences}>
                  <Link2 className="size-4" aria-hidden />
                  {COMPONENT_ACTIONS.references}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copyId()}>
                  <Copy className="size-4" aria-hidden />
                  复制组件 ID
                </DropdownMenuItem>
                {showPublish ? (
                  <DropdownMenuItem onClick={onPublish}>
                    {COMPONENT_ACTIONS.publish}
                  </DropdownMenuItem>
                ) : null}
                {showArchive ? (
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="size-4" aria-hidden />
                    {COMPONENT_ACTIONS.archive}
                  </DropdownMenuItem>
                ) : null}
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
      </div>
    </article>
  );
}

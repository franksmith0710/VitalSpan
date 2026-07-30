import { useMutation } from "@tanstack/react-query";
import { Archive, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TemplateCardPreview } from "@/components/dashboard/templates/TemplateCardPreview";
import { TemplatePreviewDialog } from "@/components/dashboard/templates/TemplatePreviewDialog";
import { TemplatePreviewFooter } from "@/components/dashboard/templates/TemplatePreviewFooter";
import {
  resolveTemplateThumbnail,
  TEMPLATE_ACTIONS,
} from "@/components/dashboard/templates/templateLabels";
import {
  exportTemplateEnvelope,
  type DashboardTemplateListItem,
} from "@/lib/dashboardTemplates";
import { mapApiError } from "@/lib/apiError";
import { downloadJsonFile } from "@/lib/exportLayoutJson";
import { cn } from "@/lib/utils";
import { useState } from "react";

type VizTemplateCardProps = {
  item: DashboardTemplateListItem;
  canManage: boolean;
  onUse: () => void;
  onPublish: () => void;
  onArchive: () => void;
  pending: boolean;
  /** 首屏卡片 eager 加载 live 预览，减少灰块空壳感 */
  previewEager?: boolean;
};

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || "template";
  return trimmed.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-");
}

export function VizTemplateCard({
  item,
  canManage,
  onUse,
  onPublish,
  onArchive,
  pending,
  previewEager = false,
}: VizTemplateCardProps) {
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const thumbnailSrc = resolveTemplateThumbnail(item.templateKey, item.thumbnailRef);
  const showPublish = canManage && item.status === "draft";
  const showArchive =
    canManage && item.status === "published" && item.visibility !== "builtin";

  const exportMutation = useMutation({
    mutationFn: () => exportTemplateEnvelope(item.id),
    onSuccess: (envelope) => {
      downloadJsonFile(envelope, `${sanitizeFilename(item.name)}-template.json`);
      toast.success(TEMPLATE_ACTIONS.exportTemplate + " JSON 已下载");
    },
    onError: (err) => toast.error(mapApiError(err)),
    onSettled: () => setExporting(false),
  });

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-theme-xs",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-theme-md",
        "border-gray-200 dark:border-gray-800 dark:bg-white/[0.03]",
        "hover:border-brand-200 dark:hover:border-brand-500/40",
      )}
      data-testid={`viz-template-card-${item.id}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-gray-100 dark:border-white/[0.06]">
        <TemplateCardPreview
          templateId={item.id}
          surfaceKind={item.surfaceKind}
          thumbnailSrc={thumbnailSrc}
          eager={previewEager}
          className="h-full"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <header className="space-y-1">
          <h2 className="text-theme-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {item.name}
          </h2>
          <TemplatePreviewFooter
            surfaceKind={item.surfaceKind}
            categoryKey={item.categoryKey}
            visibility={item.visibility}
            status={item.status}
          />
          {item.description ? (
            <p className="line-clamp-2 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          ) : null}
        </header>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setPreviewOpen(true)}>
            <Eye className="size-3.5" aria-hidden />
            {TEMPLATE_ACTIONS.preview}
          </Button>
          <Button type="button" size="sm" variant="primary" disabled={pending} onClick={onUse}>
            {TEMPLATE_ACTIONS.use}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || exporting}
            onClick={() => {
              setExporting(true);
              exportMutation.mutate();
            }}
          >
            <Download className="size-3.5" aria-hidden />
            {TEMPLATE_ACTIONS.export}
          </Button>
          {showPublish ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onPublish}>
              {TEMPLATE_ACTIONS.publish}
            </Button>
          ) : null}
          {showArchive ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onArchive}>
              <Archive className="size-3.5" aria-hidden />
              {TEMPLATE_ACTIONS.archive}
            </Button>
          ) : null}
        </div>
      </div>

      <TemplatePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} item={item} />
    </article>
  );
}

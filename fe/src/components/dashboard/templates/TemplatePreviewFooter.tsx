import type { ReactNode } from "react";
import { LayoutDashboard, Monitor } from "lucide-react";
import type { DashboardTemplateListItem } from "@/lib/dashboardTemplates";
import {
  categoryLabel,
  statusLabel,
  surfaceLabel,
  visibilityLabel,
} from "@/components/dashboard/templates/templateLabels";

type TemplatePreviewFooterProps = {
  surfaceKind: DashboardTemplateListItem["surfaceKind"];
  categoryKey: string;
  visibility: DashboardTemplateListItem["visibility"];
  status: DashboardTemplateListItem["status"];
};

function buildTrailing({
  categoryKey,
  visibility,
  status,
}: Pick<TemplatePreviewFooterProps, "categoryKey" | "visibility" | "status">): ReactNode {
  const parts: string[] = [categoryLabel(categoryKey)];
  const vis = visibilityLabel(visibility);
  if (vis) parts.push(vis);
  if (status !== "published") parts.push(statusLabel(status));
  return parts.join(" · ");
}

export function TemplatePreviewFooter({
  surfaceKind,
  categoryKey,
  visibility,
  status,
}: TemplatePreviewFooterProps) {
  const Icon = surfaceKind === "data-screen" ? Monitor : LayoutDashboard;

  return (
    <>
      <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-gray-600 dark:text-gray-400">
        <Icon className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{surfaceLabel(surfaceKind)}</span>
      </span>
      <span className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-500">
        {buildTrailing({ categoryKey, visibility, status })}
      </span>
    </>
  );
}

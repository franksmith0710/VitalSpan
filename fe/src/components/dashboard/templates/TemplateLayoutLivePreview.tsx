import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import type { Geo3dRenderTier } from "@/components/charts/engine/three/geo3dRuntime";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import type { DashboardTemplateListItem } from "@/lib/dashboardTemplates";
import { TemplateGridFitPreview } from "@/components/dashboard/templates/TemplateGridFitPreview";
import { cn } from "@/lib/utils";

type TemplateLayoutLivePreviewProps = {
  layout: DashboardLayout;
  surfaceKind: DashboardTemplateListItem["surfaceKind"];
  className?: string;
  geo3dRenderTier?: Geo3dRenderTier;
  demoDatasourceMissing?: boolean;
};

/** 模板布局实时预览（Hub 卡片 / 预览弹窗共用） */
export function TemplateLayoutLivePreview({
  layout,
  surfaceKind,
  className,
  geo3dRenderTier = "thumbnail",
  demoDatasourceMissing = false,
}: TemplateLayoutLivePreviewProps) {
  const isScreen = surfaceKind === "data-screen";

  return (
    <div className={cn("relative h-full w-full", className)} data-testid="template-layout-live-preview">
      {demoDatasourceMissing ? (
        <p
          className="pointer-events-none absolute inset-x-0 top-2 z-20 mx-auto max-w-[90%] rounded-md bg-amber-50/90 px-2 py-1 text-center text-[10px] leading-snug text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 sm:text-theme-xs"
          data-testid="template-demo-ds-hint"
        >
          请先在数据连接中配置 sample_db 演示数据源以预览真实图表
        </p>
      ) : null}
      {isScreen ? (
        <DataScreenPresenter
          layout={layout}
          presentationMode="fit"
          geo3dRenderTier={geo3dRenderTier}
          className="pointer-events-none h-full min-h-0 select-none"
        />
      ) : layout.version === 1 ? (
        <TemplateGridFitPreview layout={layout}>
          <DashboardLayoutPreview
            layout={layout}
            scaleMode="component"
            geo3dRenderTier={geo3dRenderTier}
            mountMaxConcurrent={6}
            className="pointer-events-none min-h-0 select-none"
          />
        </TemplateGridFitPreview>
      ) : (
        <DashboardLayoutPreview
          layout={layout}
          scaleMode="component"
          geo3dRenderTier={geo3dRenderTier}
          mountMaxConcurrent={6}
          className="pointer-events-none h-full min-h-0 select-none [&_.pixel-canvas-host]:h-full [&_.pixel-canvas-host]:min-h-0 [&_.pixel-canvas-host]:overflow-hidden"
        />
      )}
    </div>
  );
}

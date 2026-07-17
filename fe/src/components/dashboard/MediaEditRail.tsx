import { Input } from "@/components/ui/input";
import { ColorField } from "@/components/ui/color-field";
import { cn } from "@/lib/utils";
import { SURFACE_COLOR_RECOMMENDED } from "./dashboardStyleConfig";
import {
  DeAttrField,
  DeAttrForm,
  DeAttrToggleRow,
  DE_INPUT,
  DeSegmentGroup,
} from "./dashboardInspectorUi";
import { DashboardConfigSlider } from "./deAttrSlider";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { ImageSourceField } from "./imageSourceField";
import { isImageSourceValue } from "./imageSourceUtils";
import type {
  LayoutWidget,
  MediaAlign,
  MediaFit,
  MediaWidgetConfig,
} from "./layoutUtils";
import { normalizeMediaConfig } from "./layoutUtils";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { WidgetRailPanelHeader } from "./widgetRailChrome";

const FIT_OPTIONS = [
  { value: "contain", label: "包含" },
  { value: "cover", label: "覆盖" },
  { value: "fill", label: "拉伸" },
] as const;

const ALIGN_OPTIONS = [
  { value: "center", label: "居中" },
  { value: "top", label: "顶部" },
  { value: "bottom", label: "底部" },
  { value: "left", label: "左侧" },
  { value: "right", label: "右侧" },
] as const;

export type MediaEditRailProps = {
  widget: LayoutWidget & { mediaConfig: MediaWidgetConfig };
  onChange: (mediaConfig: MediaWidgetConfig) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onRailCollapse?: () => void;
  className?: string;
};

export function MediaEditRail({
  widget,
  onChange,
  onTitleChange,
  onDelete,
  onRailCollapse,
  className,
}: MediaEditRailProps) {
  const cfg = normalizeMediaConfig(widget.mediaConfig);
  const patch = (partial: Partial<MediaWidgetConfig>) => onChange({ ...cfg, ...partial });
  const previewUrl = cfg.url.trim();
  const imageInvalid = previewUrl.length > 0 && !isImageSourceValue(previewUrl);
  const hasLink = Boolean(cfg.linkUrl?.trim());

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-900", className)}>
      <WidgetRailPanelHeader
        title={widget.title || "图片"}
        subtitle="媒体组件"
        onCollapse={onRailCollapse}
        collapseAriaLabel="收起配置"
      />

      <ChartInspectorTabs
        className="min-h-0 flex-1"
        scrollMode="parent"
        defaultTab="data"
        tabs={["data", "style"]}
        data={
          <DeAttrForm>
            <DeAttrField label="图片来源" hint="链接或本地上传" compact>
              <ImageSourceField
                variant="rail"
                showPreview
                value={cfg.url}
                onChange={(url) => patch({ url: url ?? "" })}
              />
              {imageInvalid ? (
                <p className="mt-1.5 text-theme-xs text-error-600 dark:text-error-400" role="alert">
                  请输入有效的图片链接，或选择本地图片文件
                </p>
              ) : null}
            </DeAttrField>
            <DeAttrField label="替代文本" hint="无障碍与加载失败" compact>
              <Input
                className={DE_INPUT}
                value={cfg.alt}
                placeholder="简要描述图片内容"
                onChange={(e) => patch({ alt: e.target.value })}
              />
            </DeAttrField>
            <DeAttrField label="跳转链接" hint="留空则不跳转" compact>
              <Input
                className={DE_INPUT}
                value={cfg.linkUrl ?? ""}
                placeholder="https://"
                onChange={(e) => patch({ linkUrl: e.target.value })}
              />
            </DeAttrField>
            <DeAttrToggleRow
              label="新窗口打开"
              checked={cfg.linkNewTab ?? true}
              onCheckedChange={(linkNewTab) => patch({ linkNewTab })}
            />
            {!hasLink ? (
              <p className="pb-2 text-[10px] leading-snug text-gray-400 dark:text-gray-500">
                预览态下点击图片可打开上述链接
              </p>
            ) : null}
          </DeAttrForm>
        }
        style={
          <DeAttrForm>
            {onTitleChange ? (
              <DeAttrField label="组件名称" compact>
                <Input
                  className={DE_INPUT}
                  value={widget.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  aria-label="组件名称"
                />
              </DeAttrField>
            ) : null}
            <DeAttrField label="缩放方式" compact>
              <DeSegmentGroup
                value={cfg.fit}
                options={[...FIT_OPTIONS]}
                columns={3}
                onChange={(v) => patch({ fit: v as MediaFit })}
              />
            </DeAttrField>
            <DeAttrField label="对齐" hint="留白时的锚点" compact>
              <DeSegmentGroup
                value={cfg.align ?? "center"}
                options={[...ALIGN_OPTIONS]}
                columns={3}
                sizing="fit"
                onChange={(v) => patch({ align: v as MediaAlign })}
              />
            </DeAttrField>
            <DashboardConfigSlider
              label="不透明度"
              value={cfg.opacity != null ? Math.round(cfg.opacity * 100) : undefined}
              fallback={100}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(opacity) => patch({ opacity: opacity / 100 })}
            />
            <DashboardConfigSlider
              label="圆角"
              value={cfg.borderRadius}
              fallback={0}
              min={0}
              max={32}
              step={1}
              unit="px"
              onChange={(borderRadius) => patch({ borderRadius })}
            />
            <DeAttrField label="留白底色" compact className="border-b-0">
              <ColorField
                compact
                allowClear
                swatches={SURFACE_COLOR_RECOMMENDED}
                value={cfg.background ?? ""}
                onChange={(background) => patch({ background: background || "" })}
              />
            </DeAttrField>
            <p className="pb-1 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
              支持 JPG、PNG、GIF、SVG、WebP；本地上传将转为 data URL 嵌入看板配置。
            </p>
          </DeAttrForm>
        }
      />

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}

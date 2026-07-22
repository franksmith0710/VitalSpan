import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DeAttrField,
  DeAttrForm,
  DeAttrToggleRow,
  DE_INPUT,
} from "./dashboardInspectorUi";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { ImageSourceField } from "./imageSourceField";
import { isImageSourceValue } from "./imageSourceUtils";
import type {
  LayoutWidget,
  MediaWidgetConfig,
} from "./layoutUtils";
import { normalizeMediaConfig } from "./layoutUtils";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { WidgetRailPanelHeader } from "./widgetRailChrome";
import { MediaWidgetStylePanel } from "./widgetRailStyleSections";

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
            {hasLink ? (
              <p className="pb-2 text-[10px] leading-snug text-gray-400 dark:text-gray-500">
                预览态下点击图片可打开上述链接
              </p>
            ) : null}
            <p className="border-t border-gray-100 pb-1 pt-2 text-[10px] leading-relaxed text-gray-400 dark:border-white/[0.06] dark:text-gray-500">
              支持 JPG、PNG、GIF、SVG、WebP；本地上传将转为 data URL 嵌入看板配置。
            </p>
          </DeAttrForm>
        }
        style={
          <MediaWidgetStylePanel
            widget={widget}
            cfg={cfg}
            onChange={onChange}
            onTitleChange={onTitleChange}
          />
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

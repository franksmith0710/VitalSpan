import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import {
  estimateV1GridCanvasHeight,
  resolveTemplateGridFitScale,
} from "./templateGridFitScale";

type TemplateGridFitPreviewProps = {
  layout: DashboardLayout;
  children: ReactNode;
};

/** 仪表板 v1 栅格在窄卡片内 scale-to-fit，避免只露出底栏元信息 */
export function TemplateGridFitPreview({ layout, children }: TemplateGridFitPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentHeight = useMemo(
    () => estimateV1GridCanvasHeight(layout.widgets),
    [layout.widgets],
  );
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;

    const update = () => {
      setScale(resolveTemplateGridFitScale(el.clientHeight, contentHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentHeight]);

  return (
    <div ref={hostRef} className="h-full w-full overflow-hidden" data-testid="template-grid-fit-host">
      <div
        className="origin-top-left"
        style={{
          width: scale > 0 ? `${100 / scale}%` : "100%",
          height: contentHeight,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

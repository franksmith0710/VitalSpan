import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  computePresentationTransform,
  type PresentationMode,
} from "./presentationScale";

export type CanvasScaleViewportProps = {
  canvasWidth: number;
  canvasHeight: number;
  mode?: PresentationMode;
  className?: string;
  children: ReactNode;
};

export function CanvasScaleViewport({
  canvasWidth,
  canvasHeight,
  mode = "fit",
  className,
  children,
}: CanvasScaleViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const transform = computePresentationTransform(
    size.width,
    size.height,
    canvasWidth,
    canvasHeight,
    mode,
  );

  const stageStyle: CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scaleX}, ${transform.scaleY})`,
    transformOrigin: "top left",
  };

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      data-canvas-scale-viewport
      data-presentation-mode={mode}
    >
      <div className="absolute left-0 top-0" style={stageStyle}>
        {children}
      </div>
    </div>
  );
}

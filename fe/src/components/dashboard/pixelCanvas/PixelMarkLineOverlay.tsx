import type { PixelCanvasBounds } from "./geometry";
import type { MarkLineGuide } from "./pixelMarkLine";

const HORIZONTAL_LINES = new Set<MarkLineGuide["id"]>(["xt", "xc", "xb"]);

type PixelMarkLineOverlayProps = {
  guides: MarkLineGuide[];
  canvas: PixelCanvasBounds;
};

export function PixelMarkLineOverlay({ guides, canvas }: PixelMarkLineOverlayProps) {
  if (guides.length === 0) return null;

  return (
    <svg
      data-testid="pixel-mark-line-overlay"
      className="pixel-mark-line-overlay pointer-events-none absolute inset-0 z-[1000]"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      aria-hidden
    >
      {guides.map((guide) =>
        HORIZONTAL_LINES.has(guide.id) ? (
          <line
            key={guide.id}
            data-testid={`mark-line-${guide.id}`}
            className="pixel-canvas-mark-line"
            x1={0}
            y1={guide.position}
            x2={canvas.width}
            y2={guide.position}
          />
        ) : (
          <line
            key={guide.id}
            data-testid={`mark-line-${guide.id}`}
            className="pixel-canvas-mark-line"
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={canvas.height}
          />
        ),
      )}
    </svg>
  );
}

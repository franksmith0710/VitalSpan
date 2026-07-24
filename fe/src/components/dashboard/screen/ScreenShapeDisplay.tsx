import { normalizeScreenShapeStyle, type ScreenShapeStyleConfig } from "@/lib/screenVisualStyle";
import { cn } from "@/lib/utils";

export type ScreenShapeDisplayProps = {
  className?: string;
  styleConfig?: ScreenShapeStyleConfig;
};

export function ScreenShapeDisplay({ className, styleConfig }: ScreenShapeDisplayProps) {
  const style = normalizeScreenShapeStyle(styleConfig);
  const stroke = style.strokeColor;
  const fill = `${stroke}${Math.round(style.fillOpacity * 255).toString(16).padStart(2, "0")}`;

  return (
    <div
      className={cn("pointer-events-none flex size-full min-h-0 items-center justify-center", className)}
      data-screen-shape
      aria-hidden
    >
      {style.shape === "rect" ? (
        <div
          className="size-[70%] rounded-sm"
          style={{ border: `${style.strokeWidth}px solid ${stroke}`, backgroundColor: fill }}
        />
      ) : style.shape === "triangle" ? (
        <div
          className="size-[60%]"
          style={{
            clipPath: "polygon(50% 8%, 92% 92%, 8% 92%)",
            backgroundColor: fill || "transparent",
            border: `${style.strokeWidth}px solid ${stroke}`,
          }}
        />
      ) : (
        <div
          className="size-[65%] rounded-full"
          style={{ border: `${style.strokeWidth}px solid ${stroke}`, backgroundColor: fill }}
        />
      )}
    </div>
  );
}

export function ScreenShapePreview({
  shape,
  className,
}: {
  shape: "rect" | "triangle" | "circle";
  className?: string;
}) {
  return (
    <div className={cn("relative flex aspect-square w-full items-center justify-center rounded-md bg-[#0a0e14]", className)}>
      <ScreenShapeDisplay
        className="size-10"
        styleConfig={{ shape, strokeColor: "#cbd5e1", strokeWidth: 1.5, fillOpacity: 0 }}
      />
    </div>
  );
}

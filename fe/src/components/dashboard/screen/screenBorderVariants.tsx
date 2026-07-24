import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";

type BorderRenderProps = {
  accent: string;
  innerOpacity: number;
  glow?: string;
  className?: string;
  preview?: boolean;
};

function BorderFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("pointer-events-none relative size-full min-h-0", className)} style={style}>
      {children}
    </div>
  );
}

function corner(accent: string, position: string) {
  return (
    <span
      className={cn("absolute size-3", position)}
      style={{ borderColor: accent }}
    />
  );
}

const BORDER_RENDERERS: Record<ScreenBorderVariant, (props: BorderRenderProps) => ReactNode> = {
  "border-1": ({ accent, innerOpacity, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div
        className="absolute inset-2 rounded-lg"
        style={{ border: `1px solid ${accent}${Math.round(innerOpacity * 255).toString(16).padStart(2, "0")}` }}
      />
      {corner(accent, "left-1 top-1 border-l-2 border-t-2")}
      {corner(accent, "right-1 top-1 border-r-2 border-t-2")}
      {corner(accent, "bottom-1 left-1 border-b-2 border-l-2")}
      {corner(accent, "bottom-1 right-1 border-b-2 border-r-2")}
      <span
        className="absolute left-1/2 top-1 h-px w-16 -translate-x-1/2"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${accent}cc, transparent)` }}
      />
    </BorderFrame>
  ),
  "border-2": ({ accent, innerOpacity, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div
        className="absolute inset-3"
        style={{ border: `1px solid ${accent}${Math.round(innerOpacity * 255).toString(16).padStart(2, "0")}` }}
      />
      <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2" style={{ borderColor: accent }} />
      <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2" style={{ borderColor: accent }} />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2" style={{ borderColor: accent }} />
      <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2" style={{ borderColor: accent }} />
    </BorderFrame>
  ),
  "border-3": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-2 border border-dashed" style={{ borderColor: `${accent}66` }} />
      <span className="absolute left-2 top-2 h-2 w-6 bg-current" style={{ color: accent }} />
      <span className="absolute right-2 top-2 h-2 w-6 bg-current" style={{ color: accent }} />
      <span className="absolute bottom-2 left-2 h-2 w-6 bg-current" style={{ color: accent }} />
      <span className="absolute bottom-2 right-2 h-2 w-6 bg-current" style={{ color: accent }} />
    </BorderFrame>
  ),
  "border-4": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-2 border" style={{ borderColor: accent }} />
      <div className="absolute inset-4 border" style={{ borderColor: `${accent}55` }} />
      {corner(accent, "left-1 top-1 border-l-2 border-t-2")}
      {corner(accent, "right-1 top-1 border-r-2 border-t-2")}
      {corner(accent, "bottom-1 left-1 border-b-2 border-l-2")}
      {corner(accent, "bottom-1 right-1 border-b-2 border-r-2")}
    </BorderFrame>
  ),
  "border-5": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-x-4 top-2 h-px" style={{ backgroundColor: accent }} />
      <div className="absolute inset-x-4 bottom-2 h-px" style={{ backgroundColor: `${accent}88` }} />
      <div className="absolute inset-y-4 left-2 w-px" style={{ backgroundColor: accent }} />
      <div className="absolute inset-y-4 right-2 w-px" style={{ backgroundColor: `${accent}88` }} />
      <span className="absolute left-1 top-1 size-2 rounded-full" style={{ backgroundColor: accent }} />
      <span className="absolute right-1 top-1 size-2 rounded-full" style={{ backgroundColor: accent }} />
    </BorderFrame>
  ),
  "border-6": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-2 border-t-2 border-b-2" style={{ borderColor: accent }} />
      <span className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 border border-r-0" style={{ borderColor: accent }} />
      <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 border border-l-0" style={{ borderColor: accent }} />
    </BorderFrame>
  ),
  "border-7": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-3 rotate-45 border" style={{ borderColor: `${accent}88` }} />
      <div className="absolute inset-5 border" style={{ borderColor: accent }} />
    </BorderFrame>
  ),
  "border-8": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-2 border-l-2 border-r-2" style={{ borderColor: accent }} />
      <span className="absolute left-2 top-2 h-1 w-8" style={{ backgroundColor: accent }} />
      <span className="absolute right-2 bottom-2 h-1 w-8" style={{ backgroundColor: `${accent}88` }} />
      {corner(accent, "left-1 top-1 border-l-2 border-t-2")}
      {corner(accent, "right-1 bottom-1 border-r-2 border-b-2")}
    </BorderFrame>
  ),
  "border-9": ({ accent, glow, className }) => (
    <BorderFrame className={className} style={{ boxShadow: glow }}>
      <div className="absolute inset-2 rounded-sm border-2" style={{ borderColor: accent }} />
      <div className="absolute inset-4 rounded-sm border" style={{ borderColor: `${accent}44` }} />
      <span
        className="absolute left-1/2 top-0 h-2 w-10 -translate-x-1/2 border-x border-b"
        style={{ borderColor: accent, backgroundColor: `${accent}22` }}
      />
      <span
        className="absolute bottom-0 left-1/2 h-2 w-10 -translate-x-1/2 border-x border-t"
        style={{ borderColor: accent, backgroundColor: `${accent}22` }}
      />
    </BorderFrame>
  ),
};

export function renderScreenBorderVariant(
  variant: ScreenBorderVariant,
  props: BorderRenderProps,
): ReactNode {
  return BORDER_RENDERERS[variant]?.(props) ?? BORDER_RENDERERS["border-1"](props);
}

export function ScreenBorderVariantPreview({
  variant,
  className,
}: {
  variant: ScreenBorderVariant;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[#0a0e14]", className)}>
      {renderScreenBorderVariant(variant, {
        accent: "#7dd3fc",
        innerOpacity: 0.4,
        className: "p-1",
      })}
    </div>
  );
}

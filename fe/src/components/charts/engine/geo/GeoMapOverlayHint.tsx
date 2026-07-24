import { cn } from "@/lib/utils";

export type GeoMapOverlayTone = "warning" | "error" | "info";

export type GeoMapOverlayHintProps = {
  message: string;
  tone?: GeoMapOverlayTone;
  className?: string;
  "data-testid"?: string;
};

const toneClass: Record<GeoMapOverlayTone, string> = {
  warning: "text-warning-700 dark:text-warning-400",
  error: "text-error-600 dark:text-error-400",
  info: "text-gray-500 dark:text-gray-400",
};

/** 地图内轻量浮层提示：不占文档流，贴底居中，与占位 hint 一致 */
export function GeoMapOverlayHint({
  message,
  tone = "warning",
  className,
  "data-testid": testId,
}: GeoMapOverlayHintProps) {
  return (
    <p
      role="status"
      data-testid={testId}
      className={cn(
        "dw-hint pointer-events-none absolute inset-x-2 bottom-2 z-[1] line-clamp-2 text-center",
        toneClass[tone],
        className,
      )}
    >
      {message}
    </p>
  );
}

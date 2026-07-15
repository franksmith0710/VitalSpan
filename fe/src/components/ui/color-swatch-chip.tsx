import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundColor: "#f9fafb",
  backgroundImage:
    "linear-gradient(45deg,#e4e7ec 25%,transparent 25%),linear-gradient(-45deg,#e4e7ec 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e7ec 75%),linear-gradient(-45deg,transparent 75%,#e4e7ec 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
};

type ColorSwatchChipProps = {
  color?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  sm: "size-5",
  md: "size-6",
  lg: "size-7",
} as const;

/** TailAdmin 风格色块：白边 + 细环，空值显示棋盘格 */
export function ColorSwatchChip({
  color,
  size = "md",
  selected = false,
  className,
}: ColorSwatchChipProps) {
  return (
    <span
      className={cn(
        SIZE_CLASS[size],
        "shrink-0 rounded-[5px] border-2 border-white shadow-theme-xs ring-1 ring-gray-200 dark:border-gray-800 dark:ring-gray-600",
        selected && "ring-2 ring-brand-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900",
        className,
      )}
      style={color ? { backgroundColor: color } : CHECKERBOARD_STYLE}
      aria-hidden
    />
  );
}

import { cn } from "@/lib/utils";
import { FIELD_DRAG_MIME } from "@/lib/chartFieldDrag";

type ChartFieldSlotProps = {
  label: string;
  fieldName?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onClear?: () => void;
  onDropField?: (fieldName: string) => void;
  className?: string;
};

export function ChartFieldSlot({
  label,
  fieldName,
  active,
  disabled,
  onClick,
  onClear,
  onDropField,
  className,
}: ChartFieldSlotProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(e) => {
          if (disabled || !onClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          const field = e.dataTransfer.getData(FIELD_DRAG_MIME);
          if (field) onDropField?.(field);
        }}
        className={cn(
          "flex min-h-10 items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-theme-sm transition-colors",
          fieldName
            ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10"
            : "border-gray-200 bg-gray-50/40 dark:border-gray-700 dark:bg-white/[0.02]",
          active && "ring-2 ring-brand-500/30",
          !disabled && "cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/40",
          disabled && "opacity-60",
        )}
        aria-label={fieldName ? `${label}: ${fieldName}` : `${label}，拖动字段至此处`}
      >
        {fieldName ? (
          <>
            <span className="min-w-0 truncate font-medium text-gray-800 dark:text-white/90">
              {fieldName}
            </span>
            {onClear ? (
              <button
                type="button"
                className="shrink-0 text-theme-xs text-gray-400 hover:text-error-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                aria-label={`清空${label}`}
              >
                ×
              </button>
            ) : null}
          </>
        ) : (
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">拖动字段至此处</span>
        )}
      </div>
    </div>
  );
}

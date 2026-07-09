import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
};

export function SearchField({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
  inputClassName,
  onClear,
}: SearchFieldProps) {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        aria-hidden
      />
      <Input
        type="text"
        role="searchbox"
        enterKeyHint="search"
        className={cn("h-11 pl-9", value ? "pr-10" : "pr-4", inputClassName)}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      {value ? (
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="清除搜索"
          onClick={handleClear}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </div>
  );
}

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AnalysisTheme } from "../useStandardAnalysis";
import { ALL_ANALYSIS_THEMES, THEME_META } from "./standardAnalysisUi";

type Props = {
  enabledThemes: AnalysisTheme[];
  onToggle: (theme: AnalysisTheme, checked: boolean) => void;
};

export function StandardAnalysisThemeGrid({ enabledThemes, onToggle }: Props) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {ALL_ANALYSIS_THEMES.map((theme) => {
        const checked = enabledThemes.includes(theme);
        const meta = THEME_META[theme];
        const Icon = meta.icon;
        return (
          <label
            key={theme}
            className={cn(
              "group flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
              checked
                ? "border-brand-200 bg-brand-50/50 shadow-theme-xs dark:border-brand-500/35 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80 dark:border-gray-800 dark:bg-transparent dark:hover:border-gray-700 dark:hover:bg-white/[0.02]",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                checked
                  ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                  : "bg-gray-100 text-gray-500 group-hover:bg-gray-200/80 dark:bg-white/[0.06] dark:text-gray-400",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggle(theme, value === true)}
                  aria-label={meta.label}
                />
                <span className="text-theme-sm font-medium text-gray-800 dark:text-gray-100">
                  {meta.label}
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

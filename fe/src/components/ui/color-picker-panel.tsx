import * as React from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { hexToRgb, pickerHex, rgbToHex } from "@/components/ui/color-utils";

type ColorPickerPanelProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

const HexColorPicker = React.lazy(async () => {
  const module = await import("react-colorful");
  return { default: module.HexColorPicker };
});

type RgbChannel = "r" | "g" | "b";

function RgbField({
  channel,
  value,
  onChange,
}: {
  channel: RgbChannel;
  value: number;
  onChange: (channel: RgbChannel, next: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="space-y-1">
      <span className="block text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {channel}
      </span>
      <Input
        className="h-8 px-1.5 text-center font-mono text-theme-xs tabular-nums"
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = Number.parseInt(next, 10);
          if (!Number.isNaN(parsed)) onChange(channel, parsed);
        }}
        onBlur={() => setDraft(String(value))}
        aria-label={`${channel.toUpperCase()} 分量`}
      />
    </div>
  );
}

export function ColorPickerPanel({ value, onChange, className }: ColorPickerPanelProps) {
  const hex = pickerHex(value);
  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 };
  const canEyeDrop = typeof window !== "undefined" && "EyeDropper" in window;

  const handleRgbChange = (channel: RgbChannel, next: number) => {
    onChange(rgbToHex(channel === "r" ? next : rgb.r, channel === "g" ? next : rgb.g, channel === "b" ? next : rgb.b));
  };

  const pickFromScreen = async () => {
    if (!canEyeDrop) return;
    try {
      const EyeDropperCtor = (window as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } })
        .EyeDropper;
      const dropper = new EyeDropperCtor();
      const result = await dropper.open();
      onChange(result.sRGBHex.toLowerCase());
    } catch {
      // user cancelled
    }
  };

  return (
    <div className={cn("vs-color-picker", className)}>
      <React.Suspense
        fallback={
          <div
            className="h-[168px] w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            aria-hidden
          />
        }
      >
        <HexColorPicker color={hex} onChange={(next) => onChange(next.toLowerCase())} />
      </React.Suspense>
      <div className="mt-3 flex items-center gap-2.5">
        <button
          type="button"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
          )}
          onClick={() => void pickFromScreen()}
          disabled={!canEyeDrop}
          title={canEyeDrop ? "从屏幕取色" : "当前浏览器不支持屏幕取色"}
          aria-label="从屏幕取色"
        >
          <Pipette className="size-4" aria-hidden />
        </button>
        <span
          className="size-9 shrink-0 rounded-full border-2 border-white shadow-theme-sm ring-1 ring-gray-200 dark:border-gray-800 dark:ring-gray-700"
          style={{ backgroundColor: hex }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate font-mono text-theme-xs text-gray-600 dark:text-gray-400">
          {hex}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <RgbField channel="r" value={rgb.r} onChange={handleRgbChange} />
        <RgbField channel="g" value={rgb.g} onChange={handleRgbChange} />
        <RgbField channel="b" value={rgb.b} onChange={handleRgbChange} />
      </div>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IMAGE_SOURCE_ACCEPT,
  isDataImageUrl,
  isImageSourceValue,
  readImageFileAsDataUrl,
} from "./imageSourceUtils";

export type ImageSourceFieldProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  inputClassName?: string;
  className?: string;
  showPreview?: boolean;
  pickerLabel?: string;
  allowClear?: boolean;
};

/** 图片地址输入：支持 https 链接 + 系统文件选择（转 data URL 本地预览） */
export function ImageSourceField({
  value,
  onChange,
  placeholder = "输入链接或选择本地图片",
  inputClassName,
  className,
  showPreview = false,
  pickerLabel = "选择图片",
  allowClear = true,
}: ImageSourceFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLocal = isDataImageUrl(value);
  const previewUrl = value.trim();

  useEffect(() => {
    if (!isLocal) setLocalName(null);
  }, [isLocal]);

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setLocalName(file.name);
      setError(null);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取图片失败");
    }
  };

  const inputPlaceholder = isLocal
    ? `已选择：${localName ?? "本地图片"}`
    : placeholder;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-2">
        <Input
          id={inputId}
          className={cn("min-w-0 flex-1", inputClassName)}
          value={isLocal ? "" : value}
          readOnly={isLocal}
          placeholder={inputPlaceholder}
          onChange={(event) => {
            setError(null);
            setLocalName(null);
            const next = event.target.value;
            onChange(next.trim() || undefined);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 gap-1.5 px-3 text-theme-xs"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-4 shrink-0" aria-hidden />
          {pickerLabel}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_SOURCE_ACCEPT}
          className="sr-only"
          aria-label={pickerLabel}
          onChange={handleFilePick}
        />
        {allowClear && value.trim() ? (
          <Button
            type="button"
            variant="ghost"
            className="size-9 shrink-0 px-0"
            aria-label="清除图片"
            onClick={() => {
              setLocalName(null);
              setError(null);
              onChange(undefined);
            }}
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      ) : null}
      {showPreview && isImageSourceValue(previewUrl) ? (
        <div
          className="h-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          style={{
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          role="img"
          aria-label="图片预览"
        />
      ) : null}
    </div>
  );
}

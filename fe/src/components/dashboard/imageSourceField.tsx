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
  /** inline：输入框 + 按钮横排；rail：432px 配置栏纵向紧凑布局（无图标按钮） */
  variant?: "inline" | "rail";
};

function useImageSourceFieldState(
  value: string,
  onChange: (value: string | undefined) => void,
) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLocal = isDataImageUrl(value);
  const previewUrl = value.trim();
  const hasPreview = previewUrl.length > 0 && isImageSourceValue(previewUrl);

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

  const clearValue = () => {
    setLocalName(null);
    setError(null);
    onChange(undefined);
  };

  const openFilePicker = () => fileRef.current?.click();

  return {
    fileRef,
    localName,
    error,
    isLocal,
    previewUrl,
    hasPreview,
    handleFilePick,
    clearValue,
    openFilePicker,
    setError,
    setLocalName,
  };
}

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
  variant = "inline",
}: ImageSourceFieldProps) {
  const inputId = useId();
  const {
    fileRef,
    localName,
    error,
    isLocal,
    previewUrl,
    hasPreview,
    handleFilePick,
    clearValue,
    openFilePicker,
    setError,
    setLocalName,
  } = useImageSourceFieldState(value, onChange);

  const railPlaceholder = isLocal
    ? `已选择：${localName ?? "本地图片"}`
    : (placeholder === "输入链接或选择本地图片" ? "粘贴图片链接" : placeholder);

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept={IMAGE_SOURCE_ACCEPT}
      className="sr-only"
      aria-label={pickerLabel}
      onChange={handleFilePick}
    />
  );

  if (variant === "rail") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex gap-2.5">
          {showPreview && hasPreview ? (
            <div
              className="size-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              role="img"
              aria-label="图片预览"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Input
              id={inputId}
              className={cn("h-9 w-full", inputClassName)}
              value={isLocal ? "" : value}
              readOnly={isLocal}
              placeholder={railPlaceholder}
              onChange={(event) => {
                setError(null);
                setLocalName(null);
                const next = event.target.value;
                onChange(next.trim() || undefined);
              }}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                className="text-theme-xs font-medium text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-brand-400 dark:hover:text-brand-300"
                onClick={openFilePicker}
              >
                本地上传
              </button>
              {allowClear && value.trim() ? (
                <button
                  type="button"
                  className="text-theme-xs text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={clearValue}
                >
                  清除
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {fileInput}
        {error ? (
          <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

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
          onClick={openFilePicker}
        >
          <ImagePlus className="size-4 shrink-0" aria-hidden />
          {pickerLabel}
        </Button>
        {fileInput}
        {allowClear && value.trim() ? (
          <Button
            type="button"
            variant="ghost"
            className="size-9 shrink-0 px-0"
            aria-label="清除图片"
            onClick={clearValue}
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
      {showPreview && hasPreview ? (
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

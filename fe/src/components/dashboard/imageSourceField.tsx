import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IMAGE_SOURCE_ACCEPT,
  isDataImageUrl,
  isImageSourceValue,
  readImageFileAsDataUrl,
} from "./imageSourceUtils";
import { localizeApiMessage } from "@/lib/apiError";
import { ImagePreviewCard, ImageUploadDropZone, RailDivider } from "./imageSourceFieldRail";

export type ImageSourceFieldProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  inputClassName?: string;
  className?: string;
  showPreview?: boolean;
  pickerLabel?: string;
  allowClear?: boolean;
  /** inline：输入框 + 按钮横排；rail：432px 配置栏纵向紧凑布局 */
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

  const processFile = async (file: File) => {
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setLocalName(file.name);
      setError(null);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? localizeApiMessage(err.message) : "读取图片失败");
    }
  };

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processFile(file);
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
    processFile,
    clearValue,
    openFilePicker,
    setError,
    setLocalName,
  };
}

function HiddenFileInput({
  fileRef,
  pickerLabel,
  onChange,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  pickerLabel: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      ref={fileRef}
      type="file"
      accept={IMAGE_SOURCE_ACCEPT}
      className="sr-only"
      aria-label={pickerLabel}
      onChange={onChange}
    />
  );
}

function FieldError({ error }: { error: string }) {
  return (
    <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
      {error}
    </p>
  );
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
    processFile,
    clearValue,
    openFilePicker,
    setError,
    setLocalName,
  } = useImageSourceFieldState(value, onChange);

  const railPlaceholder = isLocal
    ? "已选择本地图片，可在下方替换"
    : placeholder === "输入链接或选择本地图片"
      ? "粘贴图片 HTTPS 链接"
      : placeholder;

  const showRailPreview = hasPreview && (showPreview || isLocal);

  if (variant === "rail") {
    const previewCaption = isLocal
      ? (localName ?? "本地图片")
      : previewUrl.length > 48
        ? `${previewUrl.slice(0, 48)}…`
        : previewUrl;

    return (
      <div className={cn("space-y-2", className)}>
        <div className="space-y-1">
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400"
          >
            <Link2 className="size-3" aria-hidden />
            图片链接
          </label>
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
        </div>

        <RailDivider />

        {showRailPreview ? (
          <ImagePreviewCard
            previewUrl={previewUrl}
            caption={previewCaption}
            onReplace={openFilePicker}
            onClear={allowClear ? clearValue : undefined}
            allowClear={allowClear}
          />
        ) : (
          <ImageUploadDropZone
            onOpen={openFilePicker}
            onFile={(file) => void processFile(file)}
            hasError={Boolean(error)}
          />
        )}

        <HiddenFileInput fileRef={fileRef} pickerLabel={pickerLabel} onChange={handleFilePick} />
        {error ? <FieldError error={error} /> : null}
      </div>
    );
  }

  const inputPlaceholder = isLocal ? `已选择：${localName ?? "本地图片"}` : placeholder;

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
        <HiddenFileInput fileRef={fileRef} pickerLabel={pickerLabel} onChange={handleFilePick} />
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
      {error ? <FieldError error={error} /> : null}
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

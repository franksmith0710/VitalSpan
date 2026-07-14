import { forwardRef, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eraser,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  RICH_TEXT_DEFAULT_FONT_SIZE,
  RICH_TEXT_FONT_SIZES,
  richTextEditorSurfaceProps,
} from "./richTextEditorSession";

const FONT_FAMILIES = [
  { label: "宋体", value: "SimSun, serif" },
  { label: "黑体", value: "SimHei, sans-serif" },
  { label: "微软雅黑", value: "Microsoft YaHei, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
] as const;

const TEXT_COLORS = ["#111827", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed"] as const;
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e5e7eb"] as const;

type RichTextToolbarProps = {
  editor: Editor;
  className?: string;
  style?: CSSProperties;
  density?: "compact" | "comfortable";
  floating?: boolean;
  "data-testid"?: string;
};

function Divider({ tall }: { tall?: boolean }) {
  return (
    <span
      className={cn("mx-1 w-px shrink-0 bg-gray-200 dark:bg-gray-700", tall ? "h-7" : "h-5")}
      aria-hidden
    />
  );
}

function matchFontFamily(current: string | undefined, option: string): boolean {
  if (!current) return option.startsWith("SimSun");
  return current.replace(/['"]/g, "").includes(option.split(",")[0].replace(/['"]/g, ""));
}

export const RichTextToolbar = forwardRef<HTMLDivElement, RichTextToolbarProps>(function RichTextToolbar(
  { editor, className, style, density = "comfortable", floating = false, "data-testid": testId },
  ref,
) {
  const comfortable = density === "comfortable";
  const [, bump] = useState(0);

  useEffect(() => {
    const refresh = () => bump((value) => value + 1);
    editor.on("transaction", refresh);
    editor.on("selectionUpdate", refresh);
    return () => {
      editor.off("transaction", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor]);

  const textStyle = editor.getAttributes("textStyle");
  const currentSize = (textStyle.fontSize as string | undefined) ?? RICH_TEXT_DEFAULT_FONT_SIZE;
  const currentColor = (textStyle.color as string | undefined) ?? "#111827";
  const currentHighlight = (textStyle.backgroundColor as string | undefined) ?? "transparent";
  const currentFamily =
    FONT_FAMILIES.find((item) => matchFontFamily(textStyle.fontFamily as string | undefined, item.value))
      ?.value ?? FONT_FAMILIES[0].value;

  const iconClass = comfortable ? "size-4" : "size-3.5";
  const btnClass = comfortable ? "size-9" : "size-7";
  const controlH = comfortable ? "h-9" : "h-7";
  const textClass = comfortable ? "text-sm" : "text-xs";

  const ToolbarIcon = ({
    label,
    active,
    disabled,
    onClick,
    children,
  }: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <IconButton
      type="button"
      variant="ghost"
      size={comfortable ? "sm" : "xs"}
      className={cn(
        btnClass,
        "shrink-0 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white",
        active && "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white",
      )}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </IconButton>
  );

  return (
    <div
      ref={ref}
      data-testid={testId ?? "rich-text-toolbar"}
      {...richTextEditorSurfaceProps}
      style={style}
      className={cn(
        "dashboard-no-drag z-[121] border border-gray-200 bg-white px-2.5 py-2 shadow-theme-md dark:border-gray-700 dark:bg-gray-900",
        floating ? "rounded-xl" : "rounded-none border-t",
        comfortable && "min-w-[42rem] max-w-[calc(100vw-1.5rem)]",
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1 overflow-x-only">
        <ToolbarIcon
          label="撤销"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className={iconClass} />
        </ToolbarIcon>
        <ToolbarIcon
          label="重做"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className={iconClass} />
        </ToolbarIcon>

        <Divider tall={comfortable} />

        <Select
          value={currentFamily}
          onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        >
          <SelectTrigger
            className={cn(
              "dashboard-no-drag shrink-0 border-0 bg-transparent shadow-none focus:ring-0",
              controlH,
              comfortable ? "w-28 px-2 text-sm" : "w-[4.5rem] px-1.5 text-xs",
            )}
            aria-label="字体"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent {...richTextEditorSurfaceProps}>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSize}
          onValueChange={(value) => editor.chain().focus().setFontSize(value).run()}
        >
          <SelectTrigger
            className={cn(
              "dashboard-no-drag shrink-0 border-0 bg-transparent shadow-none focus:ring-0",
              controlH,
              comfortable ? "w-28 px-2 text-sm" : "w-[3.25rem] px-1.5 text-xs",
            )}
            aria-label="字号"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent {...richTextEditorSurfaceProps}>
            {RICH_TEXT_FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Divider tall={comfortable} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "dashboard-no-drag inline-flex shrink-0 items-center gap-1 rounded-lg px-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10",
                controlH,
                textClass,
              )}
              aria-label="文字颜色"
              onMouseDown={(event) => event.preventDefault()}
            >
              <span className="text-base font-semibold leading-none">A</span>
              <span className={cn("rounded-full", comfortable ? "h-1 w-5" : "h-0.5 w-4")} style={{ backgroundColor: currentColor }} />
              <ChevronDown className="size-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[9rem]" {...richTextEditorSurfaceProps}>
            {TEXT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color}
                className="gap-2 text-sm"
                onClick={() => editor.chain().focus().setColor(color).run()}
              >
                <span className="size-3.5 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
                {color}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "dashboard-no-drag inline-flex shrink-0 items-center gap-1 rounded-lg px-2 hover:bg-gray-100 dark:hover:bg-white/10",
                controlH,
                textClass,
              )}
              aria-label="高亮颜色"
              onMouseDown={(event) => event.preventDefault()}
            >
              <Highlighter className={iconClass} />
              <span
                className="size-3 rounded-full border border-gray-200"
                style={{ backgroundColor: currentHighlight === "transparent" ? "#fef08a" : currentHighlight }}
              />
              <ChevronDown className="size-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[9rem]" {...richTextEditorSurfaceProps}>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().unsetHighlightColor().run()}>
              无高亮
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {HIGHLIGHT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color}
                className="gap-2 text-sm"
                onClick={() => editor.chain().focus().setHighlightColor(color).run()}
              >
                <span className="size-3.5 rounded-sm border border-gray-200" style={{ backgroundColor: color }} />
                {color}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider tall={comfortable} />

        <ToolbarIcon label="粗体" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className={iconClass} />
        </ToolbarIcon>
        <ToolbarIcon label="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className={iconClass} />
        </ToolbarIcon>
        <ToolbarIcon label="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className={iconClass} />
        </ToolbarIcon>
        <ToolbarIcon label="删除线" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className={iconClass} />
        </ToolbarIcon>
        <ToolbarIcon
          label="插入链接"
          active={editor.isActive("link")}
          onClick={() => {
            const href = window.prompt("输入链接地址", editor.getAttributes("link").href ?? "");
            if (href === null) return;
            if (!href.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href: href.trim(), target: "_blank" }).run();
          }}
        >
          <Link2 className={iconClass} />
        </ToolbarIcon>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "dashboard-no-drag inline-flex shrink-0 items-center gap-1 rounded-lg px-2 hover:bg-gray-100 dark:hover:bg-white/10",
                controlH,
              )}
              aria-label="列表"
              onMouseDown={(event) => event.preventDefault()}
            >
              <List className={iconClass} />
              <ChevronDown className="size-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" {...richTextEditorSurfaceProps}>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="size-4" />
              无序列表
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="size-4" />
              有序列表
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider tall={comfortable} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "dashboard-no-drag inline-flex shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10",
                btnClass,
              )}
              aria-label="更多格式"
              onMouseDown={(event) => event.preventDefault()}
            >
              <MoreHorizontal className={iconClass} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" {...richTextEditorSurfaceProps}>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft className="size-4" />
              左对齐
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter className="size-4" />
              居中对齐
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="size-4" />
              右对齐
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <Eraser className="size-4" />
              清除格式
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export const RICH_TEXT_FONT_SIZES = [
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
  "36px",
  "42px",
  "48px",
  "56px",
  "64px",
  "72px",
  "96px",
  "108px",
  "120px",
  "144px",
  "168px",
  "192px",
] as const;

export const RICH_TEXT_DEFAULT_FONT_SIZE = "32px";
export const RICH_TEXT_DEFAULT_FONT_FAMILY = "SimSun, serif";

export const RICH_TEXT_EDITOR_SURFACE_ATTR = "data-rich-text-editor-surface";

export const richTextEditorSurfaceProps = {
  [RICH_TEXT_EDITOR_SURFACE_ATTR]: "",
} as const;

export function isRichTextEditorSurface(target: Node | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(`[${RICH_TEXT_EDITOR_SURFACE_ATTR}]`) !== null;
}

export function shouldIgnoreOutsidePointerForRichText(
  target: Node,
  roots: {
    editorRoot?: HTMLElement | null;
    toolbarRoot?: HTMLElement | null;
    anchorRoot?: HTMLElement | null;
  },
): boolean {
  if (roots.editorRoot?.contains(target)) return true;
  if (roots.toolbarRoot?.contains(target)) return true;
  if (roots.anchorRoot?.contains(target)) return true;
  return isRichTextEditorSurface(target);
}

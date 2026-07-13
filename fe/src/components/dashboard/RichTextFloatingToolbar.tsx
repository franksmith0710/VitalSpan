import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { RichTextToolbar } from "./RichTextToolbar";

type RichTextFloatingToolbarProps = {
  editor: Editor;
  anchorRef: RefObject<HTMLElement | null>;
  toolbarRef: RefObject<HTMLDivElement | null>;
};

type FloatingCoords = { left: number; top: number };

const ESTIMATED_WIDTH = 720;
const ESTIMATED_HEIGHT = 52;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function measurePosition(
  anchor: DOMRect,
  toolbarWidth: number,
  toolbarHeight: number,
): FloatingCoords {
  const margin = 12;
  const left = clamp(
    anchor.left + anchor.width / 2 - toolbarWidth / 2,
    margin,
    window.innerWidth - toolbarWidth - margin,
  );
  const top = clamp(
    anchor.top + anchor.height / 2 - toolbarHeight / 2,
    margin,
    window.innerHeight - toolbarHeight - margin,
  );
  return { left, top };
}

export function RichTextFloatingToolbar({
  editor,
  anchorRef,
  toolbarRef,
}: RichTextFloatingToolbarProps) {
  const [coords, setCoords] = useState<FloatingCoords>({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? ESTIMATED_WIDTH;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
      setCoords(measurePosition(rect, toolbarWidth, toolbarHeight));
    };

    update();
    const raf = window.requestAnimationFrame(update);

    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    if (toolbarRef.current) observer.observe(toolbarRef.current);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, toolbarRef, editor]);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200]">
      <RichTextToolbar
        ref={toolbarRef}
        editor={editor}
        density="comfortable"
        floating
        className="pointer-events-auto fixed"
        style={{ left: coords.left, top: coords.top }}
        data-testid="rich-text-floating-toolbar"
      />
    </div>,
    document.body,
  );
}

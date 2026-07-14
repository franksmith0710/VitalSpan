import { useEffect, useRef } from "react";

type DocumentDragHandlers = {
  onMove: (event: PointerEvent) => void;
  onEnd: (event: PointerEvent, commit: boolean) => void;
};

/** DataEase Shape.vue：document 级 pointer 监听，避免手柄/参考线导致丢事件 */
export function usePixelShapeDocumentDrag() {
  const handlersRef = useRef<DocumentDragHandlers | null>(null);

  useEffect(() => {
    return () => {
      handlersRef.current = null;
    };
  }, []);

  const bind = (pointerId: number, handlers: DocumentDragHandlers) => {
    handlersRef.current = handlers;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      handlersRef.current?.onMove(event);
    };

    const onEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const commit = event.type !== "pointercancel";
      handlersRef.current?.onEnd(event, commit);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      handlersRef.current = null;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  };

  return bind;
}

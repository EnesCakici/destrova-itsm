import { useCallback, useEffect, useRef, useState } from "react";

export const COMPOSER_RESIZE_DEFAULT_H = 112;
export const COMPOSER_RESIZE_MIN_H = 112;
export const COMPOSER_RESIZE_MAX_H = 320;
export const COMPOSER_RESIZE_AUTO_GROW_MAX = 200;

/** @param {"bottom"|"top"} [placement] — bottom: grow downward (customer/manager); top: grow upward (agent dock). */
export function ComposerResizeHandle({ onPointerDown, placement = "bottom", flat = false }) {
  const growUp = placement === "top";
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize message box"
      title={growUp ? "Drag up to expand" : "Drag to resize"}
      onPointerDown={onPointerDown}
      className={[
        "flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center",
        flat
          ? "border-t border-slate-200/80 bg-white"
          : growUp
            ? "border-b border-slate-200/80 bg-gradient-to-t from-white to-slate-50/90"
            : "border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-white",
      ].join(" ")}
    >
      <span className="h-1 w-10 rounded-full bg-slate-300/90" aria-hidden />
    </div>
  );
}

/** @param {"down"|"up"} [direction] — down: drag handle down to grow; up: drag handle up to grow (agent dock). */
export function useResizableComposerEditor({
  defaultHeight = COMPOSER_RESIZE_DEFAULT_H,
  minHeight = COMPOSER_RESIZE_MIN_H,
  maxHeight = COMPOSER_RESIZE_MAX_H,
  autoGrowMax = COMPOSER_RESIZE_AUTO_GROW_MAX,
  direction = "down",
} = {}) {
  const [editorHeight, setEditorHeight] = useState(defaultHeight);
  const [manualResize, setManualResize] = useState(false);
  const resizeRef = useRef({ dragging: false, startY: 0, startH: defaultHeight });

  const onEditorAutoHeight = useCallback((height) => {
    if (!manualResize) {
      setEditorHeight(height);
    }
  }, [manualResize]);

  const onResizePointerDown = useCallback((e) => {
    setManualResize(true);
    resizeRef.current = {
      dragging: true,
      startY: e.clientY,
      startH: editorHeight,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [editorHeight]);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current.dragging) return;
      const rawDelta = e.clientY - resizeRef.current.startY;
      const delta = direction === "up" ? -rawDelta : rawDelta;
      const next = Math.min(
        maxHeight,
        Math.max(minHeight, resizeRef.current.startH + delta),
      );
      setEditorHeight(next);
    };
    const onUp = () => {
      resizeRef.current.dragging = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [minHeight, maxHeight, direction]);

  const resetEditorHeight = useCallback(() => {
    setEditorHeight(defaultHeight);
    setManualResize(false);
  }, [defaultHeight]);

  return {
    editorHeight,
    manualResize,
    minHeight,
    autoGrowMax,
    onEditorAutoHeight,
    onResizePointerDown,
    resetEditorHeight,
  };
}

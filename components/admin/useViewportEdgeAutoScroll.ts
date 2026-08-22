"use client";

import { useCallback, useEffect, useRef } from "react";

type PointerPosition = { x: number; y: number };

function verticalScrollSpeed(pointerY: number) {
  const edge = Math.min(96, window.innerHeight * 0.2);
  if (pointerY < edge) return -Math.max(3, Math.ceil(18 * (edge - pointerY) / edge));
  if (pointerY > window.innerHeight - edge) return Math.max(3, Math.ceil(18 * (pointerY - (window.innerHeight - edge)) / edge));
  return 0;
}

export function useViewportEdgeAutoScroll(onScrollFrame?: (position: PointerPosition) => void) {
  const frame = useRef<number | null>(null);
  const pointer = useRef<PointerPosition | null>(null);
  const onFrame = useRef(onScrollFrame);
  const tick = useRef<() => void>(() => undefined);
  onFrame.current = onScrollFrame;

  const stop = useCallback(() => {
    pointer.current = null;
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  tick.current = () => {
    frame.current = null;
    const position = pointer.current;
    if (!position) return;
    const speed = verticalScrollSpeed(position.y);
    if (!speed) return;
    const before = window.scrollY;
    window.scrollBy({ top: speed, behavior: "auto" });
    onFrame.current?.(position);
    if (window.scrollY !== before) frame.current = window.requestAnimationFrame(tick.current);
  };

  const update = useCallback((position: PointerPosition) => {
    pointer.current = position;
    if (frame.current === null) frame.current = window.requestAnimationFrame(tick.current);
  }, []);

  useEffect(() => stop, [stop]);
  return { update, stop };
}

"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useViewportEdgeAutoScroll } from "./useViewportEdgeAutoScroll";

type SortableItemContextValue = ReturnType<typeof useSortable>;
const SortableItemContext = createContext<SortableItemContextValue | null>(null);

export function AdminSortableList({
  ids,
  onMove,
  children,
  renderOverlay,
  strategy = verticalListSortingStrategy,
  edgeAutoScroll = false,
}: {
  ids: string[];
  onMove: (activeId: string, overId: string) => void;
  children: ReactNode;
  renderOverlay?: (activeId: string) => ReactNode;
  strategy?: SortingStrategy;
  edgeAutoScroll?: boolean;
}) {
  const pointerListeners = useRef<(() => void) | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { update: updateViewportScroll, stop: stopViewportScroll } = useViewportEdgeAutoScroll();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function stopPointerTracking() {
    pointerListeners.current?.();
    pointerListeners.current = null;
    stopViewportScroll();
  }
  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    if (!edgeAutoScroll) return;
    const updateMouse = (pointerEvent: MouseEvent) => updateViewportScroll({ x: pointerEvent.clientX, y: pointerEvent.clientY });
    const updateTouch = (touchEvent: TouchEvent) => {
      const touch = touchEvent.touches[0];
      if (touch) updateViewportScroll({ x: touch.clientX, y: touch.clientY });
    };
    const activator = event.activatorEvent;
    if (activator instanceof MouseEvent) updateMouse(activator);
    if (activator instanceof TouchEvent) updateTouch(activator);
    document.addEventListener("mousemove", updateMouse, { passive: true });
    document.addEventListener("touchmove", updateTouch, { passive: true });
    pointerListeners.current = () => {
      document.removeEventListener("mousemove", updateMouse);
      document.removeEventListener("touchmove", updateTouch);
    };
  }
  function handleDragEnd(event: DragEndEvent) {
    stopPointerTracking();
    setActiveId(null);
    if (event.over && event.active.id !== event.over.id) onMove(String(event.active.id), String(event.over.id));
  }
  function handleDragCancel() {
    stopPointerTracking();
    setActiveId(null);
  }
  useEffect(() => () => {
    pointerListeners.current?.();
    pointerListeners.current = null;
    stopViewportScroll();
  }, [stopViewportScroll]);
  return <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={!edgeAutoScroll} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}><SortableContext items={ids} strategy={strategy}>{children}</SortableContext><DragOverlay adjustScale={false} dropAnimation={null} zIndex={90}>{activeId && renderOverlay ? renderOverlay(activeId) : null}</DragOverlay></DndContext>;
}

export function AdminSortableItem({ id, disabled = false, as: Tag = "div", className, children }: { id: string; disabled?: boolean; as?: "div" | "article"; className?: string | ((dragging: boolean) => string); children: ReactNode }) {
  const sortable = useSortable({ id, disabled });
  const style = { transform: CSS.Translate.toString(sortable.transform), transition: sortable.isDragging ? undefined : sortable.transition, opacity: sortable.isDragging ? 0 : undefined, willChange: sortable.transform ? "transform" : undefined };
  return <SortableItemContext.Provider value={sortable}><Tag ref={sortable.setNodeRef} style={style} className={typeof className === "function" ? className(sortable.isDragging) : className}>{children}</Tag></SortableItemContext.Provider>;
}

export function AdminDragHandle({ label, disabled = false, className = "" }: { label: string; disabled?: boolean; className?: string }) {
  const sortable = useContext(SortableItemContext);
  if (!sortable) throw new Error("AdminDragHandle must be inside AdminSortableItem");
  return <button ref={sortable.setActivatorNodeRef} type="button" disabled={disabled} {...sortable.attributes} {...sortable.listeners} aria-label={label} className={`grid size-11 shrink-0 touch-none select-none place-items-center rounded-md text-[#7d888a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] active:cursor-grabbing disabled:cursor-not-allowed disabled:text-[#c6ccca] ${disabled ? "" : "cursor-grab"} ${sortable.isDragging ? "bg-[#dfe9e6]" : "bg-transparent sm:hover:bg-[#edf2f0]"} ${className}`}><GripVertical size={17} aria-hidden="true" /></button>;
}

import { useRef, useCallback, type ReactNode } from "react";
import { useOverlayStore } from "../stores/overlay";

interface WidgetProps {
  instanceId: string;
  name: string;
  children: ReactNode;
}

export function Widget({ instanceId, name, children }: WidgetProps) {
  const editMode = useOverlayStore((s) => s.editMode);
  const widgetStates = useOverlayStore((s) => s.widgetStates);
  const setWidgetState = useOverlayStore((s) => s.setWidgetState);
  const removeInstance = useOverlayStore((s) => s.removeInstance);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const state = widgetStates[instanceId];
  if (!state) return null;

  const handleDragStart = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: state.x, origY: state.y };
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setWidgetState(instanceId, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: state.width, origH: state.height };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setWidgetState(instanceId, {
      width: Math.max(100, resizeRef.current.origW + dx),
      height: Math.max(50, resizeRef.current.origH + dy),
    });
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
  };

  const handleRemove = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      removeInstance(instanceId);
    },
    [instanceId, removeInstance],
  );

  if (!state.visible) return null;

  return (
    <div
      className="absolute"
      style={{ left: state.x, top: state.y, width: state.width, height: state.height }}
    >
      {editMode && (
        <div
          className="absolute inset-0 border-2 border-dashed border-blue-400 rounded cursor-move z-10"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          <span className="absolute -top-6 left-0 text-xs text-blue-300 bg-black/60 px-1 rounded">
            {name}
          </span>
          <button
            className="absolute -top-6 right-0 text-xs text-red-300 bg-black/60 px-1.5 rounded hover:bg-red-600/80 hover:text-white transition-colors"
            onPointerDown={handleRemove}
          >
            ×
          </button>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-400 cursor-se-resize rounded-tl"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        </div>
      )}
      <div className="w-full h-full overflow-hidden">{children}</div>
    </div>
  );
}

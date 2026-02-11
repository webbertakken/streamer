import { useRef, useCallback, useState, type ReactNode } from "react";
import { useOverlayStore } from "../stores/overlay";
import { getWidget } from "./registry";

interface WidgetProps {
  instanceId: string;
  name: string;
  children: ReactNode;
}

export function Widget({ instanceId, name, children }: WidgetProps) {
  const editMode = useOverlayStore((s) => s.editMode);
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const removeInstance = useOverlayStore((s) => s.removeInstance);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!instance) return null;

  const handleDragStart = (e: React.PointerEvent) => {
    if (!editMode || instance.locked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: instance.x, origY: instance.y };
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const snap = 8;
    const dx = Math.round((e.clientX - dragRef.current.startX) / snap) * snap;
    const dy = Math.round((e.clientY - dragRef.current.startY) / snap) * snap;
    updateInstance(instanceId, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (!editMode || instance.locked) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: instance.width, origH: instance.height };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const snap = 8;
    const dx = Math.round((e.clientX - resizeRef.current.startX) / snap) * snap;
    const dy = Math.round((e.clientY - resizeRef.current.startY) / snap) * snap;
    updateInstance(instanceId, {
      width: Math.max(96, resizeRef.current.origW + dx),
      height: Math.max(48, resizeRef.current.origH + dy),
    });
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
  };

  const handleRemove = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (instance.locked) return;
      removeInstance(instanceId);
    },
    [instanceId, instance.locked, removeInstance],
  );

  const handleToggleLock = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      updateInstance(instanceId, { locked: !instance.locked });
    },
    [instanceId, instance.locked, updateInstance],
  );

  const handleToggleSettings = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setSettingsOpen((prev) => !prev);
    },
    [],
  );

  if (!instance.visible) return null;

  const widgetDef = getWidget(instance.typeId);
  const SettingsComponent = widgetDef?.settingsComponent ?? null;

  return (
    <div
      className="absolute"
      style={{ left: instance.x, top: instance.y, width: instance.width, height: instance.height }}
    >
      {editMode && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded pointer-events-none z-10">
          <div
            className={`absolute -top-6 left-0 right-20 h-6 ${instance.locked ? "cursor-not-allowed" : "cursor-move"} pointer-events-auto`}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <span className="text-xs text-blue-300 bg-black/60 px-1 rounded">
              {name}
            </span>
          </div>
          <div className="absolute -top-6 right-0 flex items-center gap-0.5 pointer-events-auto">
            <button
              className="text-xs text-blue-300 bg-black/60 px-1.5 rounded hover:bg-blue-600/80 hover:text-white transition-colors"
              onPointerDown={handleToggleSettings}
              title="Widget settings"
            >
              ⚙
            </button>
            <button
              className="text-xs text-blue-300 bg-black/60 px-1.5 rounded hover:bg-blue-600/80 hover:text-white transition-colors"
              onPointerDown={handleToggleLock}
              title={instance.locked ? "Unlock widget" : "Lock widget"}
            >
              {instance.locked ? "🔒" : "🔓"}
            </button>
            <button
              className={`text-xs bg-black/60 px-1.5 rounded transition-colors ${instance.locked ? "text-transparent cursor-default" : "text-red-300 hover:bg-red-600/80 hover:text-white"}`}
              onPointerDown={instance.locked ? undefined : handleRemove}
              disabled={instance.locked}
            >
              ×
            </button>
          </div>
          {!instance.locked && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-400 cursor-se-resize rounded-tl pointer-events-auto"
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
          )}
        </div>
      )}
      {editMode && settingsOpen && (
        <WidgetSettingsPopover
          instanceId={instanceId}
          instance={instance}
          SettingsComponent={SettingsComponent}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <div
        className={`w-full h-full overflow-hidden ${editMode ? "bg-black/50 rounded-lg backdrop-blur-sm" : ""}`}
        style={{ opacity: instance.opacity / 100 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Per-widget settings popover anchored below the widget title bar */
function WidgetSettingsPopover({
  instanceId,
  instance,
  SettingsComponent,
  onClose,
}: {
  instanceId: string;
  instance: { opacity: number; config?: Record<string, unknown> };
  SettingsComponent: React.ComponentType<{ instanceId: string }> | null;
  onClose: () => void;
}) {
  const updateInstance = useOverlayStore((s) => s.updateInstance);

  return (
    <div className="absolute -top-2 left-full ml-2 z-50 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-3 min-w-48 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/70 font-medium">Widget settings</span>
          <button
            className="text-xs text-white/40 hover:text-white/80 transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-white/60 block">Opacity: {instance.opacity}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={instance.opacity}
            onChange={(e) => updateInstance(instanceId, { opacity: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
        {SettingsComponent && (
          <>
            <hr className="border-white/10" />
            <SettingsComponent instanceId={instanceId} />
          </>
        )}
      </div>
    </div>
  );
}

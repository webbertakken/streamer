import { useRef, useCallback, useState, useLayoutEffect, type ReactNode } from "react";
import { useOverlayStore } from "../stores/overlay";
import { getWidget } from "./registry";
import { FontPicker } from "./shared/FontPicker";

/** Resolve the effective content alignment, defaulting to right only when snapped to the right guide line. */
export function useContentAlign(instanceId: string): "left" | "center" | "right" {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  if (!instance) return "left";
  if (instance.contentAlign) return instance.contentAlign;
  const rightEdge = instance.x + instance.width;
  return rightEdge === window.innerWidth - GRID ? "right" : "left";
}

/** Tailwind flex items class for a content alignment value. */
export function contentAlignClass(align: "left" | "center" | "right"): string {
  return { left: "items-start", center: "items-center", right: "items-end" }[align];
}

/** Resolve the effective font for a widget instance: per-instance override > global font. */
export function useWidgetFont(instanceId: string): string {
  const fontFamily = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId)?.fontFamily);
  const globalFont = useOverlayStore((s) => s.globalFont);
  return fontFamily ?? globalFont;
}

/** Resolve the effective background colour for a widget. */
export function useWidgetBgColour(instanceId: string): string {
  const override = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId)?.bgColour);
  const global = useOverlayStore((s) => s.widgetBgColour);
  return override ?? global;
}

/** Resolve the effective background opacity for a widget. */
export function useWidgetBgOpacity(instanceId: string): number {
  const override = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId)?.bgOpacity);
  const global = useOverlayStore((s) => s.widgetBgOpacity);
  return override ?? global;
}

/** Resolve the effective text colour for a widget. */
export function useWidgetTextColour(instanceId: string): string {
  const override = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId)?.textColour);
  const global = useOverlayStore((s) => s.widgetTextColour);
  return override ?? global;
}

/** Convert a hex colour (#RRGGBB) + opacity (0-100) to an rgba string. */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/** Widget types that manage their own font settings via config and should not show the per-instance font override. */
const SELF_FONT_WIDGETS = new Set(["stream-title", "custom-text"]);

const GRID = 8;
const MAGNET = 16;

/** Snap a widget position to guide lines (8px margins + centre) if an edge or centre is within threshold. */
function magnetSnap(x: number, y: number, w: number, h: number): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const vGuides = [GRID, vw / 2, vw - GRID];
  const hGuides = [GRID, vh / 2, vh - GRID];

  let bestDx = MAGNET + 1;
  let snapX = x;
  for (const edge of [x, x + w / 2, x + w]) {
    for (const g of vGuides) {
      const d = Math.abs(edge - g);
      if (d < bestDx) { bestDx = d; snapX = x + (g - edge); }
    }
  }

  let bestDy = MAGNET + 1;
  let snapY = y;
  for (const edge of [y, y + h / 2, y + h]) {
    for (const g of hGuides) {
      const d = Math.abs(edge - g);
      if (d < bestDy) { bestDy = d; snapY = y + (g - edge); }
    }
  }

  return { x: snapX, y: snapY };
}

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
  const borderRadius = useOverlayStore((s) => s.borderRadius);
  const setDragging = useOverlayStore((s) => s.setDragging);
  const previewBg = useOverlayStore((s) => s.previewBg);
  const widgetLiveBg = useOverlayStore((s) => s.widgetLiveBg);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const effectiveFont = useWidgetFont(instanceId);
  const effectiveBgColour = useWidgetBgColour(instanceId);
  const effectiveBgOpacity = useWidgetBgOpacity(instanceId);
  const effectiveTextColour = useWidgetTextColour(instanceId);

  if (!instance) return null;

  const handleDragStart = (e: React.PointerEvent) => {
    if (!editMode || instance.locked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: instance.x, origY: instance.y };
    setDragging(true);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = Math.round((e.clientX - dragRef.current.startX) / GRID) * GRID;
    const dy = Math.round((e.clientY - dragRef.current.startY) / GRID) * GRID;
    const raw = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
    const snapped = magnetSnap(raw.x, raw.y, instance.width, instance.height);
    updateInstance(instanceId, snapped);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (!editMode || instance.locked) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: instance.width, origH: instance.height };
    setDragging(true);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = Math.round((e.clientX - resizeRef.current.startX) / GRID) * GRID;
    const dy = Math.round((e.clientY - resizeRef.current.startY) / GRID) * GRID;
    let w = Math.max(96, resizeRef.current.origW + dx);
    let h = Math.max(48, resizeRef.current.origH + dy);

    // Snap right/bottom edges to vertical/horizontal guides
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rightEdge = instance.x + w;
    const bottomEdge = instance.y + h;
    for (const g of [GRID, vw / 2, vw - GRID]) {
      if (Math.abs(rightEdge - g) < MAGNET) { w = g - instance.x; break; }
    }
    for (const g of [GRID, vh / 2, vh - GRID]) {
      if (Math.abs(bottomEdge - g) < MAGNET) { h = g - instance.y; break; }
    }

    updateInstance(instanceId, { width: Math.max(96, w), height: Math.max(48, h) });
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
    setDragging(false);
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
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 pointer-events-none z-10" style={{ borderRadius }}>
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
          SettingsComponent={SettingsComponent}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <div
        className={`w-full h-full overflow-hidden ${editMode && !previewBg ? "bg-black/50 backdrop-blur-sm" : ""}`}
        style={{
          borderRadius,
          fontFamily: effectiveFont,
          backgroundColor: (!editMode || previewBg || (instance.liveBg ?? widgetLiveBg)) ? hexToRgba(effectiveBgColour, effectiveBgOpacity) : undefined,
          color: effectiveTextColour,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Per-widget settings popover anchored below the widget title bar */
function WidgetSettingsPopover({
  instanceId,
  SettingsComponent,
  onClose,
}: {
  instanceId: string;
  SettingsComponent: React.ComponentType<{ instanceId: string }> | null;
  onClose: () => void;
}) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const borderRadius = useOverlayStore((s) => s.borderRadius);
  const effectiveAlign = useContentAlign(instanceId);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState<{ h: boolean; v: boolean }>({ h: false, v: false });

  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFlip({
      h: rect.right > window.innerWidth,
      v: rect.bottom > window.innerHeight,
    });
  }, []);

  if (!instance) return null;

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 pointer-events-auto ${flip.h ? "right-full mr-2" : "left-full ml-2"} ${flip.v ? "bottom-0" : "-top-2"}`}
    >
      <div className="bg-black/80 backdrop-blur-sm p-3 space-y-3 min-w-48 border border-white/10" style={{ borderRadius }}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/70 font-medium">Widget settings</span>
          <button
            className="text-xs text-white/40 hover:text-white/80 transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {instance.typeId !== "stream-title" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 shrink-0">Align</label>
            <div className="flex gap-0.5">
              {(["left", "center", "right"] as const).map((a) => {
                const active = effectiveAlign === a;
                const isAuto = !instance.contentAlign;
                return (
                  <button
                    key={a}
                    onClick={() => updateInstance(instanceId, { contentAlign: instance.contentAlign === a ? undefined : a })}
                    className={`w-4 h-4 rounded-sm transition-colors ${active ? (isAuto ? "ring-1 ring-inset ring-blue-500" : "bg-blue-500") : "bg-white/15 hover:bg-white/30"}`}
                    title={isAuto && active ? `${a} (auto)` : a}
                  />
                );
              })}
            </div>
          </div>
        )}
        <details className="group">
          <summary className="text-xs text-white/60 cursor-pointer select-none">Advanced</summary>
          <div className="mt-2 space-y-2">
            {!SELF_FONT_WIDGETS.has(instance.typeId) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/60">Font override</label>
                  {instance.fontFamily && (
                    <button
                      onClick={() => updateInstance(instanceId, { fontFamily: undefined })}
                      className="text-[10px] text-white/40 hover:text-white/60"
                      title="Reset to global"
                    >
                      ×
                    </button>
                  )}
                </div>
                <FontPicker
                  value={instance.fontFamily ?? ""}
                  onChange={(v) => updateInstance(instanceId, { fontFamily: v === "inherit" || !v ? undefined : v })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60 shrink-0">Background</label>
              <input
                type="color"
                value={instance.bgColour ?? useOverlayStore.getState().widgetBgColour}
                onChange={(e) => updateInstance(instanceId, { bgColour: e.target.value })}
                className="w-5 h-5 rounded border border-white/20 cursor-pointer bg-transparent"
              />
              {instance.bgColour && (
                <button
                  onClick={() => updateInstance(instanceId, { bgColour: undefined })}
                  className="text-[10px] text-white/40 hover:text-white/60"
                  title="Reset to global"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60 shrink-0">BG opacity</label>
              <input
                type="range"
                min={0}
                max={100}
                value={instance.bgOpacity ?? useOverlayStore.getState().widgetBgOpacity}
                onChange={(e) => updateInstance(instanceId, { bgOpacity: Number(e.target.value) })}
                className="flex-1 accent-blue-500"
              />
              {instance.bgOpacity !== undefined && (
                <button
                  onClick={() => updateInstance(instanceId, { bgOpacity: undefined })}
                  className="text-[10px] text-white/40 hover:text-white/60"
                  title="Reset to global"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60 shrink-0">Text colour</label>
              <input
                type="color"
                value={instance.textColour ?? useOverlayStore.getState().widgetTextColour}
                onChange={(e) => updateInstance(instanceId, { textColour: e.target.value })}
                className="w-5 h-5 rounded border border-white/20 cursor-pointer bg-transparent"
              />
              {instance.textColour && (
                <button
                  onClick={() => updateInstance(instanceId, { textColour: undefined })}
                  className="text-[10px] text-white/40 hover:text-white/60"
                  title="Reset to global"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instance.liveBg ?? useOverlayStore.getState().widgetLiveBg}
                  onChange={() => updateInstance(instanceId, { liveBg: !(instance.liveBg ?? useOverlayStore.getState().widgetLiveBg) })}
                  className="accent-blue-500"
                />
                Live background
              </label>
              {instance.liveBg !== undefined && (
                <button
                  onClick={() => updateInstance(instanceId, { liveBg: undefined })}
                  className="text-[10px] text-white/40 hover:text-white/60"
                  title="Reset to global"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </details>
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

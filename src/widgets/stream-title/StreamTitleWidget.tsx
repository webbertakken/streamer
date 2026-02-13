import { useEffect, useState, useCallback, useRef } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { subscribe } from "../../events/bus";
import { fetchChannelTitle, updateChannelTitle } from "../../twitch/helix";
import { FontPicker } from "../shared/FontPicker";

export interface StreamTitleConfig {
  showOutsideEditMode: boolean;
  fontFamily: string;
  fontSize: number;
  textColour: string;
  backgroundColour: string;
  alignH: "left" | "center" | "right";
  alignV: "top" | "center" | "bottom";
}

export const DEFAULT_CONFIG: StreamTitleConfig = {
  showOutsideEditMode: false,
  fontFamily: "inherit",
  fontSize: 14,
  textColour: "#ffffff",
  backgroundColour: "transparent",
  alignH: "left",
  alignV: "center",
};

/** Per-widget settings for the stream title widget. */
export function StreamTitleSettings({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const config: StreamTitleConfig = { ...DEFAULT_CONFIG, ...(instance?.config as Partial<StreamTitleConfig>) };

  function update(partial: Partial<StreamTitleConfig>) {
    updateInstance(instanceId, { config: { ...config, ...partial } });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showOutsideEditMode}
          onChange={() => update({ showOutsideEditMode: !config.showOutsideEditMode })}
          className="accent-blue-500"
        />
        Show outside edit mode
      </label>
      <div className="space-y-1">
        <label className="text-xs text-white/60 block">Font</label>
        <FontPicker value={config.fontFamily} onChange={(fontFamily) => update({ fontFamily })} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Size</label>
        <input
          type="number"
          min={10}
          max={48}
          value={config.fontSize}
          onChange={(e) => update({ fontSize: Math.min(48, Math.max(10, Number(e.target.value) || 14)) })}
          className="w-14 bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-white/40">px</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Text colour</label>
        <input
          type="color"
          value={config.textColour}
          onChange={(e) => update({ textColour: e.target.value })}
          className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
        />
        <span className="text-xs text-white/40">{config.textColour}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Background</label>
        <input
          type="color"
          value={config.backgroundColour === "transparent" ? "#000000" : config.backgroundColour}
          onChange={(e) => update({ backgroundColour: e.target.value })}
          className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
        />
        <button
          onClick={() => update({ backgroundColour: "transparent" })}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${config.backgroundColour === "transparent" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
        >
          None
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Align</label>
        <div className="grid grid-cols-3 gap-0.5">
          {(["top", "center", "bottom"] as const).map((v) =>
            (["left", "center", "right"] as const).map((h) => (
              <button
                key={`${v}-${h}`}
                onClick={() => update({ alignH: h, alignV: v })}
                className={`w-4 h-4 rounded-sm transition-colors ${config.alignH === h && config.alignV === v ? "bg-blue-500" : "bg-white/15 hover:bg-white/30"}`}
                title={`${v}-${h}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StreamTitleContent({ instanceId }: { instanceId: string }) {
  const editMode = useOverlayStore((s) => s.editMode);
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const config: StreamTitleConfig = { ...DEFAULT_CONFIG, ...(instance?.config as Partial<StreamTitleConfig>) };
  const userId = useTwitchStore((s) => s.userId);

  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial title on mount
  useEffect(() => {
    if (!userId) return;
    fetchChannelTitle(userId)
      .then(setTitle)
      .catch((e) => console.warn("[stream-title] failed to fetch title:", e));
  }, [userId]);

  // Subscribe to channel.update events for live title updates
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "channel_update" && typeof event.data.title === "string") {
        setTitle(event.data.title);
      }
    });
  }, []);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = useCallback(() => {
    setDraft(title);
    setEditing(true);
  }, [title]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  const saveTitle = useCallback(async () => {
    if (!userId || !draft.trim()) return;
    setSaving(true);
    try {
      await updateChannelTitle(userId, draft.trim());
      setTitle(draft.trim());
      setEditing(false);
      setDraft("");
      console.info("[stream-title] title updated");
    } catch (e) {
      console.error("[stream-title] failed to update title:", e);
    } finally {
      setSaving(false);
    }
  }, [userId, draft]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle().catch(console.error);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  if (!editMode && !config.showOutsideEditMode) return null;

  const justifyClass = { left: "justify-start", center: "justify-center", right: "justify-end" }[config.alignH];
  const alignClass = { top: "items-start", center: "items-center", bottom: "items-end" }[config.alignV];
  const textStyle = { fontFamily: config.fontFamily, fontSize: config.fontSize, color: config.textColour };

  return (
    <div
      className={`h-full relative flex ${justifyClass} ${alignClass} px-3 py-2`}
      style={{ backgroundColor: config.backgroundColour }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          aria-label="Stream title"
          className="bg-transparent min-w-0 outline-none disabled:opacity-40"
          style={{ ...textStyle, width: `${Math.max(1, draft.length)}ch` }}
        />
      ) : (
        <span className="truncate min-w-0" style={textStyle}>
          {title || <span style={{ color: `${config.textColour}66`, fontStyle: "italic" }}>No title set</span>}
        </span>
      )}
      {editMode && !editing && (
        <button
          onClick={startEditing}
          aria-label="Edit stream title"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-sm"
          title="Edit title"
        >
          &#x270E;
        </button>
      )}
      {editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
          <button
            onClick={() => { saveTitle().catch(console.error); }}
            disabled={saving || !draft.trim()}
            aria-label="Save title"
            className="text-green-400 hover:text-green-300 disabled:opacity-40 text-sm px-1"
            title="Save"
          >
            &#x2713;
          </button>
          <button
            onClick={cancelEditing}
            disabled={saving}
            aria-label="Cancel editing"
            className="text-red-400 hover:text-red-300 disabled:opacity-40 text-sm px-1"
            title="Cancel"
          >
            &#x2717;
          </button>
        </div>
      )}
    </div>
  );
}

export function StreamTitleWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Stream title">
      <StreamTitleContent instanceId={instanceId} />
    </Widget>
  );
}


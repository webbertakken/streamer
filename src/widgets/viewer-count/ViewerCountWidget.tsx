import { useEffect } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { subscribe } from "../../events/bus";
import { create } from "zustand";

interface ViewerCountState {
  count: number;
  setCount: (count: number) => void;
}

export const useViewerCount = create<ViewerCountState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

/** Computes the connection status dot classes based on IRC and EventSub state. */
function connectionDotClass(irc: boolean, eventSub: boolean): string {
  if (irc && eventSub) return "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
  if (irc || eventSub) return "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
  return "w-2.5 h-2.5 rounded-full bg-red-500";
}

function ViewerCountContent() {
  const count = useViewerCount((s) => s.count);
  const setCount = useViewerCount((s) => s.setCount);
  const editMode = useOverlayStore((s) => s.editMode);
  const connected = useTwitchStore((s) => s.connected);
  const eventSubConnected = useTwitchStore((s) => s.eventSubConnected);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "viewer_count_update") {
        setCount(event.data.count as number);
      }
    });
  }, [setCount]);

  const dotClass = connectionDotClass(connected, eventSubConnected);
  const tooltip = editMode
    ? `IRC: ${connected ? "connected" : "disconnected"}\nEventSub: ${eventSubConnected ? "connected" : "disconnected"}`
    : undefined;

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className={`flex items-center gap-2 px-2 py-0.5 ${editMode ? "" : "bg-black/30 rounded"}`}>
        <div className={dotClass} title={tooltip} />
        <span className="text-white text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
        <span className="text-white/60 text-sm">viewers</span>
      </div>
    </div>
  );
}

export function ViewerCountWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Viewer count">
      <ViewerCountContent />
    </Widget>
  );
}

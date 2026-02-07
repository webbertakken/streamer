import { useEffect, useReducer } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { subscribe, type ChannelEvent } from "../../events/bus";

interface FollowEntry {
  id: string;
  username: string;
  timestamp: number;
}

const follows: FollowEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

let unsubBus: (() => void) | null = null;

function ensureSubscribed() {
  if (!unsubBus) {
    unsubBus = subscribe((event: ChannelEvent) => {
      if (event.type !== "follow") return;
      follows.unshift({
        id: `${event.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        username: (event.data.user_name as string) || (event.data.username as string) || "unknown",
        timestamp: event.timestamp,
      });
      if (follows.length > 200) follows.length = 200;
      notify();
    });
  }
}

function useFollows(): FollowEntry[] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    ensureSubscribed();
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return follows;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FollowEventsContent() {
  const entries = useFollows();
  const editMode = useOverlayStore((s) => s.editMode);
  const lineBg = editMode ? "" : "bg-black/60 rounded px-1";

  if (entries.length === 0) {
    return <p className={`text-white/40 text-sm italic p-2 ${lineBg}`}>No follows yet</p>;
  }

  return (
    <div className="h-full overflow-y-auto p-2 space-y-1 scrollbar-thin">
      {entries.map((f) => (
        <div key={f.id} className={`text-sm leading-snug ${lineBg}`}>
          <span className="text-white/40 text-xs mr-1">{formatTime(f.timestamp)}</span>
          <span className="text-green-400 font-medium">{f.username}</span>
          <span className="text-white/60"> followed</span>
        </div>
      ))}
    </div>
  );
}

export function FollowEventsWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Follow events">
      <div className="h-full">
        <FollowEventsContent />
      </div>
    </Widget>
  );
}

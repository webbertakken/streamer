import { useEffect, useReducer } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { subscribe, type ChannelEvent } from "../../events/bus";
import { useTwitchStore } from "../../stores/twitch";
import { useOverlayStore } from "../../stores/overlay";

const presenceSet = new Set<string>();
const presenceListeners = new Set<() => void>();

function notifyPresence() {
  presenceListeners.forEach((fn) => fn());
}

let unsubBus: (() => void) | null = null;

function handleEvent(event: ChannelEvent) {
  if (event.type === "join") {
    presenceSet.add(event.data.username as string);
    notifyPresence();
  } else if (event.type === "part") {
    presenceSet.delete(event.data.username as string);
    notifyPresence();
  }
}

/** Start tracking. Idempotent. */
function startTracking() {
  if (!unsubBus) unsubBus = subscribe(handleEvent);
}

/** Stop tracking and clear state. */
function stopTracking() {
  if (unsubBus) {
    unsubBus();
    unsubBus = null;
  }
  presenceSet.clear();
  notifyPresence();
}

function usePresence(): string[] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    presenceListeners.add(rerender);
    return () => { presenceListeners.delete(rerender); };
  }, [rerender]);
  return Array.from(presenceSet).sort((a, b) => a.localeCompare(b));
}

function ChatPresenceContent() {
  const authenticated = useTwitchStore((s) => s.authenticated);
  const editMode = useOverlayStore((s) => s.editMode);
  const threshold = useOverlayStore((s) => s.presenceThreshold);
  const users = usePresence();
  const overThreshold = users.length > threshold;

  useEffect(() => {
    if (!authenticated) {
      stopTracking();
      return;
    }
    if (overThreshold) {
      stopTracking();
      return;
    }
    startTracking();
    return () => stopTracking();
  }, [authenticated, overThreshold]);

  const lineBg = `px-1 w-fit ${editMode ? "" : "bg-black/30 rounded"}`;

  if (!authenticated) {
    return <p className={`text-white/40 text-sm italic p-2 ${lineBg}`}>Log in to track chat presence</p>;
  }

  if (overThreshold) {
    return (
      <p className={`text-white/40 text-sm italic p-2 ${lineBg}`}>
        Chat presence is unavailable above {threshold} viewers
      </p>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2 scrollbar-thin">
      <div className={`text-white/60 text-xs mb-1 ${lineBg}`}>{users.length} in chat</div>
      {users.length === 0 ? (
        <p className={`text-white/40 text-sm italic ${lineBg}`}>No viewers tracked</p>
      ) : (
        <div className="space-y-0.5">
          {users.map((u) => (
            <div key={u} className={`text-sm text-white/80 ${lineBg}`}>{u}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatPresenceWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Chat presence">
      <div className="h-full">
        <ChatPresenceContent />
      </div>
    </Widget>
  );
}

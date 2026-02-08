import { useEffect, useReducer, useRef } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";

export type EventType = "follow" | "sub" | "gift-sub" | "raid" | "bits";

export interface StreamEvent {
  id: string;
  type: EventType;
  username: string;
  detail?: string;
  timestamp: number;
}

const eventLabels: Record<EventType, string> = {
  follow: "Followed",
  sub: "Subscribed",
  "gift-sub": "Gifted a sub",
  raid: "Raided",
  bits: "Cheered",
};

const eventColours: Record<EventType, string> = {
  follow: "text-purple-400",
  sub: "text-blue-400",
  "gift-sub": "text-pink-400",
  raid: "text-orange-400",
  bits: "text-yellow-400",
};

const events: StreamEvent[] = [];
const listeners = new Set<() => void>();

/** Push a stream event to the feed */
export function pushStreamEvent(event: Omit<StreamEvent, "id" | "timestamp">) {
  events.push({ ...event, id: crypto.randomUUID(), timestamp: Date.now() });
  if (events.length > 100) events.splice(0, events.length - 100);
  listeners.forEach((fn) => fn());
}

function useStreamEvents(): StreamEvent[] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return events;
}

function EventFeedContent() {
  const evts = useStreamEvents();
  const editMode = useOverlayStore((s) => s.editMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [evts.length]);

  const lineBg = `px-1 w-fit ${editMode ? "" : "bg-black/30 rounded"}`;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
      {evts.length === 0 && (
        <p className={`text-white/40 text-sm italic ${lineBg}`}>No events yet</p>
      )}
      {evts.map((evt) => (
        <div key={evt.id} className={`text-sm flex items-baseline gap-1.5 ${lineBg}`}>
          <span className={`font-medium ${eventColours[evt.type]}`}>{eventLabels[evt.type]}</span>
          <span className="text-white font-bold">{evt.username}</span>
          {evt.detail && <span className="text-white/50">{evt.detail}</span>}
        </div>
      ))}
    </div>
  );
}

export function EventFeedWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Event feed">
      <div className="h-full">
        <EventFeedContent />
      </div>
    </Widget>
  );
}
